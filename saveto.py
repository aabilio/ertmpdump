from Tkinter import *
import tkFileDialog
import shelve


class Ui(Frame):
  def __init__(self):
    Frame.__init__(self, None)

    self.grid()
    bquit=Button(self, text="Quit", command=self.quit_pressed)
    bchoose=Button(self, text="Choose Directory", command=self.save_prefs())
    bquit.grid(row=0, column=1)
    bchoose.grid(row=0, column=0)

  def askdirectory(self):
    """Returns a selected directoryname."""
    return tkFileDialog.askdirectory(parent=self, initialdir="./", title='Please select a directory')

  def save_prefs(self):
    d = shelve.open("prefs.local")
    d["dirpath"] = self.askdirectory()
    d.close()
    self.master.destroy()

  def quit_pressed(self):
    self.master.destroy()

app = Ui()
app.mainloop()