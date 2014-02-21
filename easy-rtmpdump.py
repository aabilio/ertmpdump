#!/usr/bin/env python
# -*- coding: utf-8 -*-

# TODO: saveto.py in windows

import sys, os, subprocess, logging, re
import webbrowser, urlparse, json
import shelve, gevent, random, string

from threading import Thread

import lib.requests as requests
from lib.Socketio import socketio_manage
from lib.Socketio.server import SocketIOServer
from lib.Socketio.namespace import BaseNamespace
from lib.Socketio.mixins import RoomsMixin, BroadcastMixin


# CONSTANTS
PORT = 25431
PREFS_FILE = "prefs.local"
LOG_FILE_UNIX = 'lastlog.log'
LOG_FILE_WIN = 'lastlog.txt'

# SETTING UP SCREEN AND FILE LOGGING
LOG_FILE = LOG_FILE_UNIX if not os.name == 'nt' else LOG_FILE_WIN
try: os.remove(LOG_FILE) # Just save last exec log
except: pass

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
# Setting screen logger
screen_handler = logging.StreamHandler()
screen_handler.setFormatter(formatter)
logger.addHandler(screen_handler)

# Setting file logger
file_handler = logging.FileHandler(LOG_FILE)
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)


# HELPERS
def isWindows():
  return os.name == 'nt'

def randomName():
  return ''.join(random.choice(string.ascii_uppercase) for x in range(5))
def namespacesFactory(namespace_name=None):
  if namespace_name == "": namespace_name = "MainSocket"
  return type(namespace_name, (EasyRtmpdumpNamespace,), {})
def createSocket(socket_name):
  if not socket_name: socket_name = randomName()
  if socket_name == "main": socket_name = ""
  namespace = namespacesFactory(socket_name)
  return ("/"+socket_name, namespace)
def pydowntv(url):
  return requests.get('http://pydowntv.com/api?url=%s' % url).json()
def setClipboardData(data):
  p = subprocess.Popen(['pbcopy'], stdin=subprocess.PIPE)
  p.stdin.write(data)
  p.stdin.close()
  retcode = p.wait()


current_downloads = []
def removeFromCurrentDownloads(_id):
  for cd in current_downloads:
    if cd.has_key(_id):
      current_downloads.remove(cd)

class EasyRtmpdumpNamespace(BaseNamespace, RoomsMixin, BroadcastMixin):
  
  def on_exit_signal(self,data):
    logger.info("Ciao!")
    sys.exit()

  def on_cancel_download(self, data):
    logger.info("Cancel %s download" % data["msg"])
    _id = data["msg"]
    for cd in current_downloads:
      if cd.has_key(_id):
        # Terminate cd["_id"]
        cd[_id].kill()

  def on_msg_to_backend(self, data):
    self.send_command(data["msg"])

  def on_pref_dir(self, data):
    prefs = shelve.open(PREFS_FILE)
    logger.info("Getting preferences: %s" % prefs)
    self.send_dir(prefs["dirpath"], data["msg"])

  def on_choose_dir(self, data):
    logger.info("Launch saveto.py")
    args = ["python", "saveto.py"] # TODO: do it for windows too
    out = subprocess.call(args, stdout=subprocess.PIPE)
    prefs = shelve.open(PREFS_FILE)
    self.send_dir(prefs["dirpath"], data["msg"])

  def on_command(self, data):
    logger.info("Text Command received: %s" % data["command"])
    command = data["command"].split()
    logger.info("Split Command received: %s" % command)
    _id = data["_id"]

    if data.has_key("orig"):
      logger.info("Orig detected: %s" % data["orig"])
      if data["orig"].find("mitele.es/") != -1: # Hack for mitele with PyDownTV
        try:
          command = str(pydowntv(data["orig"])['videos'][0]['rtmpd_cmd'][0]).replace("\"", "")
          logger.info("Hack for mitele & pydowntv. New Command: \n\n%s\n\n" % command)
          setClipboardData(command)
          command = command.split()
          logger.info("Split new Command received: %s" % command)
        except: pass # Try with command we have... :(

    prefs = shelve.open(PREFS_FILE)
    if prefs.has_key("dirpath"):
      name_index=command.index("-o")+1
      command[name_index] = os.path.join(prefs['dirpath'], command[name_index])

    # Send Destination info:
    try: vDest = command[command.index("-o")+1]
    except: vDest = "undefined"
    self.send_download_additional_info("destination", _id, vDest)

    proc = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    current_downloads.append({_id:proc})

    def sendRtmpdumpProcess(a):
      first = True
      total_seconds_founded = False
      logger.info("Starting download id: %s" % _id)
      while proc.poll() is None:
        line = ""
        for byte in iter(lambda: proc.stdout.read(1), b''):
          line += byte
          if byte == ")" and line[-2] == "%":
            if not first: self.send_progress(line.rstrip(), _id)
            else:
              try: total_seconds = re.findall("INFO:.*duration(.*)" ,line)[0].lstrip()
              except: total_seconds = "undefined"
              logger.info( "total_seconds FOUNDED: %s" % total_seconds )
              self.send_download_additional_info("total_seconds", _id, total_seconds)
              first = False

            gevent.sleep()
            break
          last_line = line
        #logger.info("Process: [first=%s] [%s] [%s]" % ( str(first), _id, line.rstrip().decode('utf8') ) )
      
      if first:
        logger.error("Error at download id: %s" % _id)
        self.broadcast_event('error', last_line)
        self.send_progress("Error (100.0%)", _id)
      else:
        # Download finished
        self.broadcast_event('progress_to_web', last_line.strip().split("(")[0]+" (100.0%)", _id)
        self.send_download_additional_info("finished", _id, "true")
        removeFromCurrentDownloads(_id)
        logger.info("Download with id: '%s' has finished" % _id)

      return True

    th=Thread(target=sendRtmpdumpProcess, args=(True,))
    th.daemon = True
    th.start()

  def send_download_additional_info(self, key, _id, info):
    self.broadcast_event('download_additional_info', key, _id, info)

  def send_progress(self, progress, _id):
    self.broadcast_event('progress_to_web', progress, _id)

  def send_dir(self, _dir, _id):
    self.broadcast_event('dir_to_web', _dir)

  def send_general_msg(self, msg):
    self.broadcast_event('msg_to_web', msg)

  def send_command(self, command):
    self.broadcast_event('rtmpdump_command_to_web', command)

  def recv_disconnect(self):
    self.disconnect(silent=True)

class Application(object):
  def __init__(self):
    prefs = shelve.open(PREFS_FILE)
    if not prefs.has_key("dirpath"): prefs["dirpath"] = os.path.expanduser("~")
    prefs.close()

    webbrowser.open("http://localhost:"+str(PORT),2)

    self.buffer = []
    # Dummy request object to maintain state between Namespace
    # initialization.
    self.request = {
      'nicknames': [],
    }
    #self.namespaces = {}
    self.namespaces = {'': EasyRtmpdumpNamespace}

    


  def __call__(self, environ, start_response):
    path = environ['PATH_INFO'].strip('/')
    if environ["QUERY_STRING"]:
      q = urlparse.parse_qs(environ["QUERY_STRING"])
      if q.has_key("command"):
        command = q["command"][0]

    if not path:
      path = 'easy-rtmpdump.html'

    if path == 'keepalive':
      start_response('200 OK', [('Content-Type', 'text/html')])
      return ["All OK"]

    if path.startswith('static/') or path == 'easy-rtmpdump.html':
      try:
        data = open('webview/'+path).read()
      except Exception:
        return not_found(start_response)

      if path.endswith(".js"):
        content_type = "text/javascript"
      elif path.endswith(".css"):
        content_type = "text/css"
      elif path.endswith(".swf"):
        content_type = "application/x-shockwave-flash"
      elif path.endswith(".jpg"):
        content_type = "image/jpg"
      elif path.endswith(".png"):
        content_type = "image/png"
      elif path.endswith(".woff"):
        content_type = "application/font-woff"
      else:
        content_type = "text/html"

      start_response('200 OK', [('Content-Type', content_type)])
      return [data]

    if path.find(".html") != -1 and path != 'add_new_socket.html':
      socket_name = path.split(".")[0]
      (new_socket_name, new_namespace) = createSocket(socket_name)
      logger.info("CREATING new Socket: %s" % new_socket_name)
      self.namespaces[new_socket_name] = new_namespace

      start_response('200 OK', [('Content-Type', 'text/html')])
      return ["All OK"]

    if path.startswith("socket.io"):
      logger.info("New socket connection. Namespaces: %s" % self.namespaces)
      socketio_manage(environ, self.namespaces, self.request)
    else:
      return not_found(start_response)


def not_found(start_response):
  start_response('404 Not Found', [])
  return ['<h1>Not Found</h1>']


if __name__ == '__main__':
  logger.info('Listening on port %d and on port 843 (flash policy server)' % PORT)
  try:
    SocketIOServer(('0.0.0.0', PORT), Application(),
          resource="socket.io", policy_server=True,
          policy_listener=('0.0.0.0', 10843)).serve_forever()
  except (SystemExit, KeyboardInterrupt):
    pass

  except Exception, e:
    logger.error('ERROR', exc_info=True)
