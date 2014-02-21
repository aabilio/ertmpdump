angular.module("gettext").run(['gettextCatalog', function (gettextCatalog) {
    gettextCatalog.setStrings('es_ES', {"<b>TYPE NEW COMMAND</b>":"<b>INTRODUCE UN NUEVO COMANDO</b>","A new program is going to be opened in your computer to select a folder on your hard disk (it can be late a few seconds).":"Un nuevo programa se va a ejecutar en tu ordenador para seleccionar una carpeta de descarga (puede tardar unos pocos segundos en abrirse).","A unknown error occurred":"Se ha producido un error","Additional Information":"Información Adicional","Are you sure that you want to cancel the download?":"¿Estás seguro de que quieres cancelar la descarga?","CONNECTION PROBLEM":"SE HA DETECTADO UN PROBLEMA EN LA CONEXIÓN","Cancel":"Cancelar","Cancel & remove download":"Cancelar y borrar la descarga","Choose a folder on your hard disk to store the downloaded files":"Elige una carpeta en tu disco duro para almacenar las descargas","Click to show/hide additional info":"Haz clic para mostrar/ocultar información adicional","Complete (100%)":"Descarga finalizada (100%)","Connecting...":"Conectando...","DISCONNECT":"DESCONECTAR","DOWNLOAD":"DESCARGAR","Disconnect":"Desconectar","Do it!":"¡Sí!","Exact rtmpdump command output":"Salida exacta del comando rtmpdump","Exit":"Salir","It seems that the connection has got lost with backend program. The most probable thing is that the downloads have stopped working. This window is going to be closed and you will have to return to execute the program from your operating system.":"Parece que se ha perdido la conexión con el programa. Lo más probable es que las descargas hayan dejado de funcionar. Esta ventana se va a cerrar y tendrás que volver a ejecutar el programa desde tu sistema operativo.","OK":"OK","Open":"Abrir","The downloads that already are in process will not meet affected by this change.":"Las descargas que ya se están realizando no se verán afectadas por este cambio.","This window is going to be closed and the backend program is going to finish":"Esta ventana se va a cerrar y el programa va a acabar su ejecución","Time remaining: {{ cd.time_remaining }}":"Tiempo restante: {{ cd.time_remaining }}","To select a new folder...":"Para seleccionar una nueva carpeta...","WHERE TO DOWNLOAD":"¿DÓNDE DESCARGAR?","You have to do click in the icon of the folder that is to the left of the box that you have just selected. ;)":"Tienes que hacer clic en el icono de la carpeta que se encuentra a la izquierda del campo de texto que acabas de seleccionar ;)","\"{{ cd.name }}\" is going to be cancelled":"Se va a cancelar la descarga: \"{{ cd.name }}\"","{{ 'Command' }}":"{{ 'Comando' }}","{{ 'Destination' }}":"{{ 'Destino' }}","{{ 'Download started at' }}":"{{ 'La descarga comenzó' }}","{{ 'Location' }}":"{{ 'Página web' }}"});

}]);