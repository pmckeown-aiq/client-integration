var _=require('lodash');
var transactions = [
  {
    ExternalReference: '100',
    lines: [ { "StockItemID": 1 },  { "StockItemID": 2 } ]
  },
  {
    ExternalReference: '200',
    lines: [ { "StockItemID": 4 } ]
  }
];

pete = _.flatMap(transactions, 'lines').length;
// -> ['Alex', 'Bob']
console.log(JSON.stringify(pete));
