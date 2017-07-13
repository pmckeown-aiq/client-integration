array = [
	[
	{inv:"a", 
		lines:[
			{"a:":1},
			{"n":2}
		]
	}],
	[       {inv:"b",
                lines:[
                        {"a:":1},
                        {"n":2}
                ]
        }
, {inv:"c"}, {inv:"d"}]
];
console.log(JSON.stringify(array));
array = array.reduce((a, b) => a.concat(b), []);
console.log(JSON.stringify(array));
