function doGet() {
  return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('Monitor G4S - Tiempo Real')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}


function obtenerDatos() {
  var idArchivo = "1ZTMMqsSt7cAbPTIe-pdDHtobiDtQ3hiKytmi_JdoSQ8"; 
  var ss = SpreadsheetApp.openById(idArchivo);
  var sheet = ss.getSheetByName("SOLICITUDES");
  
  if (!sheet) return JSON.stringify([]); 

  // --- OPTIMIZACIÓN DE LECTURA ---
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  
  // Si no hay datos, retornamos vacío
  if (lastRow < 2) return JSON.stringify([]);

  // CONFIGURACIÓN: ¿Cuántas filas hacia atrás mirar?
  // 1000 filas suelen ser suficientes para cubrir 2 o 3 días de operación.
  // Si tienes muchísimo volumen diario, sube este número a 2000.
  var cantidadFilasAAnalizar = 500; 

  // Calculamos desde qué fila empezar a leer
  // (Nos aseguramos de no empezar antes de la fila 2)
  var startRow = Math.max(2, lastRow - cantidadFilasAAnalizar + 1);
  var numFilas = lastRow - startRow + 1;

  // 1. Obtenemos SOLO los encabezados (Fila 1)
  var headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];

  // 2. Obtenemos SOLO el bloque de datos final (Las últimas X filas)
  // Esto es lo que acelera el script drásticamente
  var data = sheet.getRange(startRow, 1, numFilas, lastCol).getDisplayValues();

  // --- FIN OPTIMIZACIÓN ---

  // Limpiamos encabezados
  var cleanHeaders = headers.map(function(h) { 
    return h ? h.toString().trim().toUpperCase() : "COL"; 
  });

  // Fecha de HOY
  var hoy = new Date();
  var fechaHoyTexto = Utilities.formatDate(hoy, Session.getScriptTimeZone(), "dd/MM/yyyy");

  var filasFiltradas = [];

  // Recorremos el bloque pequeño de datos
  for (var i = 0; i < data.length; i++) {
    var fila = data[i];
    
    // MAPA DE COLUMNAS (Indices empiezan en 0):
    // Col A (0) = ID, Col B (1) = ESTADO, Col C (2) = FECHA
    // Col R (17) = TIPO_SERVICIO
    
    var estado = (fila[1] || "").toString().toUpperCase().trim();
    var fecha = (fila[2] || "").toString().trim();
    var tipoServicio = (fila[17] || "").toString().toUpperCase().trim(); 

    // 1. Validar ESTADO
    var esCritico = (estado === "1. SIN GESTION" || estado === "1.1 PENDIENTE");
    
    // 2. Validar FECHA (Que sea HOY)
    var esHoy = (fecha === fechaHoyTexto || fecha.indexOf(fechaHoyTexto) > -1);

    // 3. Validar NO ANS
    var noEsANS = !tipoServicio.includes("ANS");

    if (esCritico && esHoy && noEsANS) {
      var obj = {};
      fila.forEach(function(cell, index) {
        var header = cleanHeaders[index] || "COL_" + index;
        obj[header] = cell;
      });
      filasFiltradas.push(obj);
    }
  }

  return JSON.stringify(filasFiltradas);
}
