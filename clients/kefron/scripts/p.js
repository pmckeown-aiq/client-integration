var promiseForeach = require('promise-foreach')
function firstMethod(arrayVal) {
   var promise = new Promise(function(resolve, reject){
      setTimeout(function() {
         console.log('first method completed');
         resolve(arrayVal);
      }, 2000);
   });
   return promise;
};
 
function pete(arrayVal) {
  console.log(arrayVal + ' is what');
} 
function secondMethod(arrayVal) {
   var promise = new Promise(function(resolve, reject){
      setTimeout(function() {
         console.log('second method completed');
         resolve(arrayVal);
      }, 2000);
   });
   return promise;
};
 
function thirdMethod(arrayVal) {
   var promise = new Promise(function(resolve, reject){
     Promise.all[pete(arrayVal)]
      .then((result) => {
        console.log('1 Got result from Promise.all ' + JSON.stringify(result));
        resolve(result);
      })
      .catch(function(err) { // SOAP error on Save Invoice
        console.log('UpdateStageStatuse ' + err);
        reject(arrayVal);
      });
   });

   //return promise;
};
 
myArray = ['a','b','c']
myArray.forEach(function(arrayVal) {
      console.log(arrayVal);
      firstMethod(arrayVal)
       .then(function(arrayVal) {
         return secondMethod
       })
       .then(function(arrayVal) {
         console.log(arrayVal);
         return thirdMethod(arrayVal)
       });
})
console.log('done');
