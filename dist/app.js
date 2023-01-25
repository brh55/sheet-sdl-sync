const { parse, visit } = Modules;
const { fetch } = UrlFetchApp;

let test = () => {
  const changes = [
    {
      "description": "type `Author`: field `booksCount` description changed"
    },
    {
      "description": "type `Rating`: created"
    },
    {
      "description": "type `Rating`: field `name` added"
    },
    {
      "description": "type `Rating`: field `averageRating` added"
    },
    {
      "description": "type `Rating`: field `ratingCount` added"
    }
  ];
  doPost({ url: "SPREAD_SHEET_LINK_HERE" , changes })
}

// TODO: Add logic to remove old entries
const updateSpreadsheet = (sheetId, changes) => {
    const sheet = SpreadsheetApp.openById(sheetId);

    changes.forEach(entry => {
        const textFinder = sheet.createTextFinder(entry.name);
        const matches = textFinder.findAll();
        let updated = false;
  
        // Optimize to add to the parent section
        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            const row = match.getRow();
            const col = config.fieldToColum.parent;
            const parent = sheet.getRange(`${col}${row}`).getValue();
            if (entry.parent === parent) {
              // Get all mapped fields and apply the values
              Object
                .keys(config.fieldToColum.field)
                .map(key => sheet.getRange(`${config.fieldToColum.field[key]}${row}`)
                .setValue(entry[key]));
              
              updated = true;
            }
        }

        if (matches.length === 0 || !updated) {
          sheet.appendRow(['', entry.parent, entry.name, entry.valueType, entry.description]);
        }
    });
}

// Take changes from Apollo Studio
// webhook and map changes
const normalizeChanges = ({ description }) => {
    // Example: ”type `Author`: field `booksCount` description changed "
    // Reg Patterns for Matching
    const Reg = {
      parent: /(?<=type\s\`)[a-zA-Z]+(?=`)/,
      field: /(?<=field\s\`)[a-zA-Z]+(?=`)/,
      action: /(changed|added|removed)/
    }

    return {
      action: description.match(Reg.action) ? description.match(Reg.action)[0] : 'added',
      field: description.match(Reg.field) ? description.match(Reg.field)[0] : 'N/A', 
      parent: description.match(Reg.parent)[0],
    }
}

// To check status of service
function doGet() {
  const responseContent = '{"success": "Schema SDL Sync Up and Running"}';
  const response = ContentService.createTextOutput(responseContent);
  response.setMimeType(ContentService.MimeType.JSON);

  return response;
}

// Webhook POST for Notification Channel
function doPost({ postData }) {    
    const {schemaURL, changes} = JSON.parse(postData.contents);
    const response = fetch(schemaURL);
    const schema = response.getContentText();
    const ast = parse(schema);
    const toVisit = {};

    changes
      .map(normalizeChanges)
      .forEach(change => {
        toVisit[change.parent] = toVisit[change.parent] || {
          fields: new Map()
        };
        
        toVisit[change.parent].fields.set(change.field, {
            action: change.action
        });
    });

    let changesToProcess = [];

    // All Type Defs
    const changedTypeDefs = Object.keys(toVisit);

    const visitor = {
        ObjectTypeDefinition: {
            enter: (node, key, parent, path, ancestors) => changedTypeDefs.indexOf(node.name.value) !== -1,
            leave: (node) => {
              const entity = node.name.value;
              // Only process fields that have changed
              const updatedFields = node.fields.filter(field => toVisit[entity].fields.has(field.name.value));
              
              // Store metadata for changed fields
              updatedFields.forEach(
                fieldNode => {
                    let valueType = fieldNode.type.name?.value;
                        valueType = fieldNode.type.type?.name?.value ?? valueType;
                        valueType = fieldNode.type.type?.type?.name?.value ?? valueType;
                        valueType = fieldNode.type.type?.type?.type?.name?.value ?? valueType

                    changesToProcess.push({
                        kind: 'Field',
                        parent: node.name.value,
                        name: fieldNode.name.value,
                        description: fieldNode.description?.value.trim() || "",
                        valueType
                    });
                }
              )
            }
        }
    };

    visit(ast, visitor);
    try {
      updateSpreadsheet(config.spreadsheetId, changesToProcess);
      return ContentService.createTextOutput(JSON.stringify({ success: "true" }))
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ err }))
    }
}
