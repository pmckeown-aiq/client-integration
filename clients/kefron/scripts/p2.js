var https = require('https');
var promiseForeach = require('promise-foreach')
 
var list = [{
    firstName: 'John',
    lastName: 'Doe',
    photo_id: 1,
    comment_id: 3
}, {
    firstName: 'Marie',
    lastName: 'Doe',
    photo_id: 2,
    comment_id: 4
}]
 
promiseForeach.each(list,
    [
        function (person){
            return `${person.firstName} ${person.lastName}`
        },
        function (person){
            return asyncGetPhoto(person.photo_id)
        },
        function (person){
            return asyncGetComment(person.comment_id)
        }
    ],
    function (arrResult, person) {
        return {
            firstName: person.firstName,
            lastName: person.lastName,
            fullName: arrResult[0],
            photo: arrResult[1],
            comment: arrResult[2]
        }
    },
    function (err, newList) {
        if (err) {
            console.error(err)
            return;
        }
        console.log('newList : ', newList)
    })
 
function asyncGetPhoto(photo_id){
    return new Promise(function(resolve, reject){
        var request = https.get('https://jsonplaceholder.typicode.com/photos/' + photo_id, function(response){
            var body = [];
            response.on('data', function(chunk){
                body.push(chunk)
            })
            response.on('end', function(){
                resolve(JSON.parse(body.join('')))
            })
        })
        request.on('error', function(err){
            reject(err)
        })
    }) 
}
function asyncGetComment(comment_id){
        return new Promise(function(resolve, reject){
            var request = https.get('https://jsonplaceholder.typicode.com/comments/' + comment_id, function(response){
                var body = [];
                response.on('data', function(chunk){
                    body.push(chunk)
                })
                response.on('end', function(){
                    resolve(JSON.parse(body.join('')))
                })
            })
            request.on('error', function(err){
                reject(err)
            })
        }) 
    }
