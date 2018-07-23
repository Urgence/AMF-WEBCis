const http = require('http');
const {decodeAMF} = require('./amf.js');

//The url we want is: 'www.random.org/integers/?num=1&min=1&max=10&col=1&base=10&format=plain&rnd=new'
const options = {
    host: 'web-alerte.sdis38.fr',
    path: '/systel-alerte-web/gateway',
    port: 18080
};

callback = function (response) {
    let str = '';

    //another chunk of data has been received, so append it to `str`
    response.on('data', function (chunk) {
        str += chunk;
    });

    //the whole response has been received, so we just print it out here
    response.on('end', function () {
        let o = decodeAMF(str)/*.messages[0].body*/;
        console.log(JSON.stringify(o))
    });
};
http.request(options, callback).end();