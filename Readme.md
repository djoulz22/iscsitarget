# iscsitarget (http://iscsitarget.sourceforge.net/) 

Getting iscsitarget to JSON.

## License

```
            DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
                    Version 0.1, December 2013

 Copyright (C) 2013 iscsitarget Interface <jchenavas@gmail.com>

 Everyone is permitted to copy and distribute verbatim or modified
 copies of this license document, and changing it is allowed as long
 as the name is changed.

            DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
   TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION

  0. You just DO WHAT THE FUCK YOU WANT TO.
```

```
 This program is free software. It comes without any warranty, to
 the extent permitted by applicable law. You can redistribute it
 and/or modify it under the terms of the Do What The Fuck You Want
 To Public License, See http://www.wtfpl.net/ for more details.
```

## Description

Get iscsitarget

## Installation
```
npm install iscsitarget
```

## Example
```js
var iSCSITarget = require("iscsitarget");
var iscsitarget = new iSCSITarget([true/false for showing logs]);

iscsitarget.events.OnAfterOpen = function(){	
	console.log("######################################################################");
	console.log(JSON.stringify(iscsitarget.nodes,null,4));
	console.log("######################################################################");
}

iscsitarget.Open();
```
[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/djoulz22/iscsitarget/trend.png)](https://bitdeli.com/free "Bitdeli Badge")
