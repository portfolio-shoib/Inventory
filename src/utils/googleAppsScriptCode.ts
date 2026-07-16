export const APPS_SCRIPT_CODE = `/**
 * Google Sheets Inventory Manager - CRUD Web App Script
 * 
 * Instructions:
 * 1. Open a Google Sheet (or create a new one).
 * 2. Click "Extensions" > "Apps Script" in the top menu.
 * 3. Delete any default code in Code.gs and paste this entire script.
 * 4. Click the "Save" (disk) icon.
 * 5. Click "Deploy" (blue button) > "New deployment".
 * 6. Under "Select type", click the gear icon and choose "Web app".
 * 7. Set "Execute as" to "Me (your-email@gmail.com)".
 * 8. Set "Who has access" to "Anyone" (crucial for API access!).
 * 9. Click "Deploy". Authorize permissions if prompted.
 * 10. Copy the "Web app URL" and paste it into the website settings!
 */

// Handle GET requests (Fetch Items, Fetch Logs, or Test Connection)
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getOrCreateInventorySheet(ss);
    
    // Check if it is a simple connection test
    if (e && e.parameter && e.parameter.action === "test") {
      return createJSONResponse({ 
        status: "success", 
        message: "Successfully connected to Google Sheet!",
        sheetName: sheet.getName(),
        spreadsheetName: ss.getName()
      });
    }
    
    // Check if we want logs instead of inventory items
    if (e && e.parameter && e.parameter.action === "logs") {
      var logsSheet = getOrCreateLogsSheet(ss);
      var logsData = logsSheet.getDataRange().getValues();
      if (logsData.length <= 1) {
        return createJSONResponse([]); // Empty logs
      }
      
      var logsHeaders = logsData[0];
      var logs = [];
      
      // Read from bottom to top (newest first)
      for (var i = logsData.length - 1; i >= 1; i--) {
        var row = logsData[i];
        if (!row[0]) continue;
        
        var log = {};
        for (var j = 0; j < logsHeaders.length; j++) {
          var header = logsHeaders[j];
          var value = row[j];
          
          if (value instanceof Date) {
            value = Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
          }
          log[header] = value;
        }
        logs.push(log);
      }
      return createJSONResponse(logs);
    }
    
    // Fetch all items
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return createJSONResponse([]); // Empty database (only headers)
    }
    
    var headers = data[0];
    var items = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      // Skip empty rows
      if (!row[0]) continue;
      
      var item = {};
      for (var j = 0; j < headers.length; j++) {
        var header = headers[j];
        var value = row[j];
        
        // Format date values to string safely
        if (value instanceof Date) {
          value = Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
        }
        
        item[header] = value;
      }
      items.push(item);
    }
    
    return createJSONResponse(items);
    
  } catch (error) {
    return createJSONResponse({ 
      status: "error", 
      message: "GET Error: " + error.toString() 
    });
  }
}

// Handle POST requests (Add, Update, Delete)
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJSONResponse({ 
        status: "error", 
        message: "Empty POST body received." 
      });
    }
    
    var request = JSON.parse(e.postData.contents);
    var action = request.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getOrCreateInventorySheet(ss);
    var logsSheet = getOrCreateLogsSheet(ss);
    var updatedBy = request.updatedBy || "Web Dashboard";
    
    if (action === "add") {
      return handleAddItem(sheet, logsSheet, request.item, updatedBy);
    } else if (action === "update") {
      return handleUpdateItem(sheet, logsSheet, request.id, request.item, updatedBy);
    } else if (action === "delete") {
      return handleDeleteItem(sheet, logsSheet, request.id, updatedBy);
    } else {
      return createJSONResponse({ 
        status: "error", 
        message: "Invalid action. Supported actions: add, update, delete" 
      });
    }
    
  } catch (error) {
    return createJSONResponse({ 
      status: "error", 
      message: "POST Error: " + error.toString() 
    });
  }
}

// Helper to find or initialize the Inventory sheet with columns
function getOrCreateInventorySheet(ss) {
  var sheet = ss.getSheetByName("Inventory");
  var targetHeaders = [
    "ID", 
    "Item Name", 
    "SKU", 
    "Category", 
    "Quantity", 
    "Unit Price", 
    "Total Value", 
    "Last Updated",
    "Description",
    "Unit",
    "Weight Value",
    "Weight Unit",
    "Vendor Name",
    "Vendor Contact"
  ];
  
  if (!sheet) {
    sheet = ss.insertSheet("Inventory");
    sheet.appendRow(targetHeaders);
    
    // Auto-format headers (Bold)
    sheet.getRange(1, 1, 1, targetHeaders.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  } else {
    // Dynamically append any missing columns to avoid broken integrations for existing users
    var lastCol = sheet.getLastColumn();
    var existingHeaders = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
    var headersToAppend = [];
    
    for (var i = 0; i < targetHeaders.length; i++) {
      var targetHeader = targetHeaders[i];
      var found = false;
      for (var k = 0; k < existingHeaders.length; k++) {
        if (String(existingHeaders[k]).trim() === targetHeader) {
          found = true;
          break;
        }
      }
      if (!found) {
        headersToAppend.push(targetHeader);
      }
    }
    
    if (headersToAppend.length > 0) {
      var nextCol = existingHeaders.length + 1;
      var range = sheet.getRange(1, nextCol, 1, headersToAppend.length);
      range.setValues([headersToAppend]);
      range.setFontWeight("bold");
    }
  }
  
  // Format Unit Price (Column 6 / F) and Total Value (Column 7 / G) in PKR (Rs.)
  var maxRows = sheet.getMaxRows();
  if (maxRows > 1) {
    sheet.getRange(2, 6, maxRows - 1, 2).setNumberFormat('"Rs. "#,##0.00');
  }
  
  return sheet;
}

// Helper to find or initialize the Logs sheet with columns
function getOrCreateLogsSheet(ss) {
  var sheet = ss.getSheetByName("Logs");
  var headers = ["Timestamp", "Item ID", "Item Name", "Action", "Quantity Changed", "Updated By"];
  
  if (!sheet) {
    sheet = ss.insertSheet("Logs");
    sheet.appendRow(headers);
    
    // Auto-format headers (Bold)
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  } else {
    // If sheet exists but is completely empty or has missing/empty headers
    var lastCol = sheet.getLastColumn();
    var lastRow = sheet.getLastRow();
    
    if (lastCol === 0 || lastRow === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    } else {
      // Check if existing headers match. If they don't, or are empty, ensure we have them.
      var existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var hasAnyHeader = false;
      for (var i = 0; i < existingHeaders.length; i++) {
        if (String(existingHeaders[i]).trim() !== "") {
          hasAnyHeader = true;
          break;
        }
      }
      
      if (!hasAnyHeader || existingHeaders.length < headers.length) {
        // Overwrite or fill first row with standard headers
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
        sheet.setFrozenRows(1);
      }
    }
  }
  return sheet;
}

// Helper to record a log row
function appendLogEntry(logsSheet, itemId, itemName, actionName, qtyChanged, updatedBy) {
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  logsSheet.appendRow([timestamp, itemId, itemName, actionName, Number(qtyChanged) || 0, updatedBy]);
}

// Generate sequential IDs: INV-1001, INV-1002, etc.
function generateNewId(sheet) {
  var data = sheet.getDataRange().getValues();
  var maxIdNum = 1000; // Starting inventory counter
  
  for (var i = 1; i < data.length; i++) {
    var idStr = String(data[i][0]);
    if (idStr.indexOf("INV-") === 0) {
      var num = parseInt(idStr.replace("INV-", ""), 10);
      if (!isNaN(num) && num > maxIdNum) {
        maxIdNum = num;
      }
    }
  }
  return "INV-" + (maxIdNum + 1);
}

// Add Item
function handleAddItem(sheet, logsSheet, itemData, updatedBy) {
  if (!itemData) {
    return createJSONResponse({ status: "error", message: "No item data provided" });
  }
  
  var id = generateNewId(sheet);
  var lastUpdated = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  
  var headers = sheet.getDataRange().getValues()[0];
  var newRow = [];
  
  for (var j = 0; j < headers.length; j++) {
    var header = headers[j];
    if (header === "ID") {
      newRow.push(id);
    } else if (header === "Last Updated") {
      newRow.push(lastUpdated);
    } else if (header === "Total Value") {
      var quantity = Number(itemData["Quantity"]) || 0;
      var unitPrice = Number(itemData["Unit Price"]) || 0;
      newRow.push(quantity * unitPrice);
    } else if (itemData.hasOwnProperty(header)) {
      var val = itemData[header];
      if (header === "Quantity" || header === "Unit Price" || header === "Weight Value") {
        newRow.push(Number(val) || 0);
      } else {
        newRow.push(val);
      }
    } else {
      newRow.push("");
    }
  }
  
  sheet.appendRow(newRow);
  
  // Format Unit Price and Total Value columns to PKR format
  var maxRows = sheet.getMaxRows();
  if (maxRows > 1) {
    sheet.getRange(2, 6, maxRows - 1, 2).setNumberFormat('"Rs. "#,##0.00');
  }
  
  // LOG THE ADDITION
  appendLogEntry(logsSheet, id, itemData["Item Name"] || "", "New Item Added", Number(itemData["Quantity"]) || 0, updatedBy);
  
  // Build return item object dynamically
  var returnedItem = {};
  for (var j = 0; j < headers.length; j++) {
    var header = headers[j];
    if (header === "ID") returnedItem[header] = id;
    else if (header === "Last Updated") returnedItem[header] = lastUpdated;
    else if (header === "Total Value") returnedItem[header] = (Number(itemData["Quantity"]) || 0) * (Number(itemData["Unit Price"]) || 0);
    else if (itemData.hasOwnProperty(header)) {
      if (header === "Quantity" || header === "Unit Price" || header === "Weight Value") {
        returnedItem[header] = Number(itemData[header]) || 0;
      } else {
        returnedItem[header] = itemData[header];
      }
    } else {
      returnedItem[header] = "";
    }
  }
  
  return createJSONResponse({
    status: "success",
    message: "Item added successfully",
    item: returnedItem
  });
}

// Update Item
function handleUpdateItem(sheet, logsSheet, id, itemData, updatedBy) {
  if (!id) {
    return createJSONResponse({ status: "error", message: "Missing item ID for update" });
  }
  if (!itemData) {
    return createJSONResponse({ status: "error", message: "No update data provided" });
  }
  
  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      rowIndex = i + 1; // 1-based indexing, add 1 for row index
      break;
    }
  }
  
  if (rowIndex === -1) {
    return createJSONResponse({ status: "error", message: "Item with ID " + id + " not found" });
  }
  
  var headers = data[0];
  var lastUpdated = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  
  var oldItemName = "";
  var oldQuantity = 0;
  var oldUnitPrice = 0;
  
  // Find current values in the row
  for (var j = 0; j < headers.length; j++) {
    var header = headers[j];
    if (header === "Item Name") oldItemName = data[rowIndex - 1][j];
    else if (header === "Quantity") oldQuantity = Number(data[rowIndex - 1][j]) || 0;
    else if (header === "Unit Price") oldUnitPrice = Number(data[rowIndex - 1][j]) || 0;
  }
  
  var quantity = itemData.hasOwnProperty("Quantity") ? Number(itemData["Quantity"]) : oldQuantity;
  var unitPrice = itemData.hasOwnProperty("Unit Price") ? Number(itemData["Unit Price"]) : oldUnitPrice;
  var totalValue = quantity * unitPrice;
  
  // Set values cell by cell dynamically based on header match
  for (var j = 0; j < headers.length; j++) {
    var header = headers[j];
    var colIndex = j + 1;
    
    if (header === "Last Updated") {
      sheet.getRange(rowIndex, colIndex).setValue(lastUpdated);
    } else if (header === "Total Value") {
      sheet.getRange(rowIndex, colIndex).setValue(totalValue);
    } else if (header === "Quantity") {
      sheet.getRange(rowIndex, colIndex).setValue(quantity);
    } else if (header === "Unit Price") {
      sheet.getRange(rowIndex, colIndex).setValue(unitPrice);
    } else if (itemData.hasOwnProperty(header)) {
      var val = itemData[header];
      if (header === "Weight Value") {
        sheet.getRange(rowIndex, colIndex).setValue(Number(val) || 0);
      } else {
        sheet.getRange(rowIndex, colIndex).setValue(val);
      }
    }
  }
  
  // LOG THE UPDATE IF QUANTITY CHANGED OR ANY RELEVANT PARAM
  var qtyDiff = quantity - oldQuantity;
  var actionName = "Edit Details";
  if (qtyDiff > 0) {
    actionName = "Stock In";
  } else if (qtyDiff < 0) {
    actionName = "Stock Out";
  }
  
  appendLogEntry(logsSheet, id, itemData["Item Name"] || oldItemName, actionName, qtyDiff, updatedBy);
  
  // Build return item object dynamically
  var returnedItem = {};
  var updatedRowValues = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  for (var j = 0; j < headers.length; j++) {
    var header = headers[j];
    var val = updatedRowValues[j];
    if (val instanceof Date) {
      val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    }
    returnedItem[header] = val;
  }
  
  return createJSONResponse({
    status: "success",
    message: "Item updated successfully",
    item: returnedItem
  });
}

// Delete Item
function handleDeleteItem(sheet, logsSheet, id, updatedBy) {
  if (!id) {
    return createJSONResponse({ status: "error", message: "Missing item ID for deletion" });
  }
  
  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) {
    return createJSONResponse({ status: "error", message: "Item with ID " + id + " not found" });
  }
  
  var itemName = data[rowIndex - 1][1];
  var qty = Number(data[rowIndex - 1][4]);
  
  sheet.deleteRow(rowIndex);
  
  // LOG THE DELETION
  appendLogEntry(logsSheet, id, itemName, "Item Deleted", -qty, updatedBy);
  
  return createJSONResponse({
    status: "success",
    message: "Item " + id + " deleted successfully"
  });
}

// Create JSON Output helper with appropriate formatting
function createJSONResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

export const INSTRUCTIONS = [
  {
    title: "Prepare Your Google Sheet",
    description: "Create a new Google Sheet or open an existing one. Rename the default sheet tab name to 'Inventory'. The script will automatically configure headers for BOTH 'Inventory' and 'Logs' tabs on startup!"
  },
  {
    title: "Open Extensions & Code Editor",
    description: "In your Google Sheet, click Extensions in the top menu, then choose Apps Script. This opens the browser-based code editor connected to your spreadsheet."
  },
  {
    title: "Paste & Save the Script",
    description: "Replace any existing code in the code editor (typically Code.gs) with the script shown here. Click the Save icon (floppy disk) or press Ctrl+S / Cmd+S."
  },
  {
    title: "Deploy / Update Web App",
    description: "Click Deploy (top right) > New deployment (or 'Manage deployments' if updating an existing one, choosing 'New version'). Set Execute as to 'Me', and set Who has access to 'Anyone'. Click Deploy."
  },
  {
    title: "Authorize Permissions & Copy URL",
    description: "If asked, authorize the script to access your spreadsheet. Copy the provided Web App URL (which ends in /exec), switch to the Settings tab in this manager, and paste it to connect your live sheet database!"
  }
];
