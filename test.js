if (process.argv [2] === 'prod') return console.log ('Tests cannot be run on a PROD environment, dummy!');

var CONFIG = require ('./config.js');
var dale   = require ('dale');
var teishi = require ('teishi');
var h      = require ('hitit');
var log    = teishi.l, type = teishi.t, eq = teishi.eq;

var U = [
   {username: 'user  \t1', password: Math.random () + ''},
   {username: 'user2', password: Math.random () + ''},
];

var PICS = '/media/truecrypt2/acpictest/';

var intro = [
   ['get stats if none present', 'get', 'admin/stats', {}, '', 200],
   ['submit client error, invalid 1', 'post', 'clientlog', {}, '', 400],
   ['submit client error without being logged in #1', 'post', 'clientlog', {}, ['error1'], 200],
   ['submit client error without being logged in #2', 'post', 'clientlog', {}, {error: 'error'}, 200],
   ['login with no credentials', 'post', 'auth/login', {}, {}, 400],
   ['login with invalid credentials', 'post', 'auth/login', {}, [], 400],
   ['create invite for user, invalid 1', 'post', 'admin/invites', {}, {}, 400],
   ['create invite for user, invalid 2', 'post', 'admin/invites', {}, [], 400],
   ['create invite for user, invalid 3', 'post', 'admin/invites', {}, {email: 2}, 400],
   ['create invite for user, invalid 4', 'post', 'admin/invites', {}, {email: 'che'}, 400],
   ['create invite for user', 'post', 'admin/invites', {}, {email: 'a@a.com  '}, 200, function (s, rq, rs) {
      s.itoken1 = rs.body.token;
      return true;
   }],
   ['create invite for user', 'post', 'admin/invites', {}, {email: 'b@b.com  '}, 200, function (s, rq, rs) {
      s.itoken2 = rs.body.token;
      return true;
   }],
   ['signup for the first time with invalid username', 'post', 'auth/signup', {}, function (s) {
      return {username: 'a@a.com', password: U [0].password, token: s.itoken1, email: 'a@a.com'};
   }, 400],
   ['signup for the first time with invalid email', 'post', 'auth/signup', {}, function (s) {
      return {username: U [0].username, password: U [0].password, token: s.itoken1, email: 'aa.com'};
   }, 400],
   ['signup for the first time with invalid token', 'post', 'auth/signup', {}, function (s) {
      return {username: U [0].username, password: U [0].password, token: s.itoken1 + 'a', email: 'a@a.com'};
   }, 403, function (s, rq, rs) {
      if (! eq (rs.body, {error: 'token'})) return log ('Invalid body.');
      return true;
   }],
   ['signup for the first time', 'post', 'auth/signup', {}, function (s) {
      return {username: U [0].username, password: U [0].password, token: s.itoken1, email: 'a@a.com'};
   }, 200, function (s, rq, rs) {
      if (! rs.body.token) return log ('No token returned after signup!');
      s.vtoken1 = rs.body.token;
      return true;
   }],
   ['login with valid credentials before verification', 'post', 'auth/login', {}, {username: U [0].username, password: U [0].password}, 403, function (s, rq, rs) {
      if (! eq (rs.body, {error: 'verify'})) return log ('Invalid payload sent, expecting {error: "verify"}');
      return true;
   }],
   ['try to signup with existing username', 'post', 'auth/signup', {}, function (s) {
      return {username: U [0].username, password: U [1].password, token: s.itoken2, email: 'b@b.com'};
   }, 403, function (s, rq, rs) {
      if (! eq (rs.body, {error: 'username'})) return log ('Invalid payload received.');
      return true;
   }],
   ['try to signup with existing email', 'post', 'auth/signup', {}, function (s) {
      return {username: U [1].username, password: U [1].password, token: s.itoken2, email: 'a@a.com'};
   }, 403, function (s, rq, rs) {
      if (! eq (rs.body, {error: 'token'})) return log ('Invalid payload received.');
      return true;
   }],
   ['verify user', 'get', function (s) {return 'auth/verify/' + s.vtoken1}, {}, '', 302],
   ['recover pass invalid #1', 'post', 'auth/recover', {}, [], 400],
   ['recover pass invalid #2', 'post', 'auth/recover', {}, '', 400],
   ['recover pass invalid #3', 'post', 'auth/recover', {}, {}, 400],
   ['recover pass with invalid username', 'post', 'auth/recover', {}, {username: 'foo'}, 403],
   ['recover pass', 'post', 'auth/recover', {}, {username: 'a@a.com\t'}, 200],
   ['recover pass', 'post', 'auth/recover', {}, {username: 'user\t  1  '}, 200, function (s, rq, rs) {
      s.rtoken = rs.body.token;
      U [0].password = 'foobar';
      return true;
   }],
   ['reset pass with invalid token', 'post', 'auth/reset', {}, function (s) {return {username: U [0].username, password: U [0].password, token: s.rtoken + '0'}}, 403],
   ['reset pass', 'post', 'auth/reset', {}, function (s) {return {username: U [0].username, password: U [0].password, token: s.rtoken}}, 200],
   ['try to signup with existing username after verification', 'post', 'auth/signup', {}, function (s) {
      return {username: U [0].username, password: U [1].password, token: s.itoken2, email: 'b@b.com'};
   }, 403, function (s, rq, rs) {
      if (! eq (rs.body, {error: 'username'})) return log ('Invalid payload received.');
      return true;
   }],
   ['try to signup with existing email after verification', 'post', 'auth/signup', {}, function (s) {
      return {username: U [1].username, password: U [0].password, token: s.itoken2, email: 'a@a.com'};
   }, 403, function (s, rq, rs) {
      if (! eq (rs.body, {error: 'token'})) return log ('Invalid payload received.');
      return true;
   }],
   ['login with valid credentials after verification (with email)', 'post', 'auth/login', {}, U [0], 200],
   ['login with valid credentials after verification (with email)', 'post', 'auth/login', {}, function () {return {username: ' \t  a@a.com', password: U [0].password}}, 200],
   ['login with valid credentials after verification (with email)', 'post', 'auth/login', {}, function () {return {username: 'A@A.com  ', password: U [0].password}}, 200],
   ['login with valid credentials after verification (with email)', 'post', 'auth/login', {}, function () {return {username: ' USER 1\t   ', password: U [0].password}}, 200, function (state, request, response) {
      state.headers = {cookie: response.headers.cookie};
      return response.headers.cookie !== undefined;
   }],
   ['submit client error being logged in #1', 'post', 'clientlog', {}, ['error1'], 200],
   ['submit client error being logged in #2', 'post', 'clientlog', {}, {error: 'error'}, 200],
];

var outro = [
   ['logout', 'get', 'auth/logout', {}, '', 302, function (state, request, response) {
      if (! response.headers ['set-cookie'] || ! response.headers ['set-cookie'] [0].match (/max-age/i)) return false;
      if (response.headers.location !== '/') return log ('Invalid location header');
      state.headers = {};
      return true;
   }],
   ['double logout', 'get', 'auth/logout', {}, '', 302],
   ['login with valid credentials', 'post', 'auth/login', {}, U [0], 200, function (state, request, response) {
      state.headers = {cookie: response.headers.cookie};
      return response.headers.cookie !== undefined;
   }],
   ['delete account', 'post', 'auth/delete', {}, {}, 302, function (state, request, response) {
      if (! response.headers ['set-cookie'] || ! response.headers ['set-cookie'] [0].match (/max-age/i)) return false;
      if (! response.headers.location || response.headers.location !== '/') return false;
      state.headers = {};
      return true;
   }],
   ['login with deleted credentials', 'post', 'auth/login', {}, U [0], 403]
];

var main = [
   // invalid getpics
   ['query pics (invalid #1)', 'post', 'query', {}, '', 400],
   ['query pics (invalid #2)', 'post', 'query', {}, [], 400],
   ['query pics (invalid #3)', 'post', 'query', {}, {}, 400],
   ['query pics (invalid #4)', 'post', 'query', {}, {tags: 'hello'}, 400],
   ['query pics (invalid #5)', 'post', 'query', {}, {tags: []}, 400],
   ['query pics (invalid #6)', 'post', 'query', {}, {tags: [], sort: []}, 400],
   ['query pics (invalid #7)', 'post', 'query', {}, {tags: [], sort: 'NEW'}, 400],
   ['query pics (invalid #8)', 'post', 'query', {}, {tags: [], sort: 'newest'}, 400],
   ['query pics (invalid #9)', 'post', 'query', {}, {tags: [], from: 1}, 400],
   ['query pics (invalid #10)', 'post', 'query', {}, {tags: [], from: 0, to: 10}, 400],
   ['query pics (invalid #11)', 'post', 'query', {}, {tags: ['all'], sort: 'newest', from: 1, to: 10}, 400],
   ['get invalid range of pics', 'post', 'query', {}, {tags: [], sort: 'newest', from: 3, to: 1}, 400],
   ['get pics', 'post', 'query', {}, {tags: [], sort: 'newest', from: 1, to: 10}, 200, function (s, rq, rs) {
      if (! eq (rs.body, {total: 0, pics: []})) return log ('Invalid payload');
      return true;
   }],
   ['upload invalid payload #1', 'post', 'pic', {}, '', 400],
   ['upload invalid payload #2', 'post', 'pic', {}, 1, 400],
   ['upload invalid payload #3', 'post', 'pic', {}, [], 400],
   ['upload invalid payload #4', 'post', 'pic', {}, {}, 400],
   ['upload invalid payload #5', 'post', 'pic', {}, {file: {}}, 400],
   ['upload video (no support)', 'post', 'pic', {}, {multipart: [
      {type: 'file',  name: 'pic', path: PICS + 'video.mp4'},
      {type: 'field',  name: 'lastModified', value: Date.now ()}
   ]}, 400],
   ['upload picture without lastModified', 'post', 'pic', {}, {multipart: [
      {type: 'file',  name: 'pic', path: PICS + 'small.png'}
   ]}, 400],
   ['upload small picture with extra text field', 'post', 'pic', {}, {multipart: [
      {type: 'file',  name: 'pic', path: PICS + 'small.png'},
      {type: 'field',  name: 'lastModified', value: Date.now ()},
      {type: 'field',  name: 'extra', value: Date.now ()}
   ]}, 400],
   ['upload small picture with extra file field', 'post', 'pic', {}, {multipart: [
      {type: 'file',  name: 'pic', path: PICS + 'small.png'},
      {type: 'file',  name: 'pic2', path: PICS + 'small.png'},
      {type: 'field',  name: 'lastModified', value: Date.now ()}
   ]}, 400],
   ['upload small picture', 'post', 'pic', {}, {multipart: [
      {type: 'file',  name: 'pic', path: PICS + 'small.png'},
      {type: 'field',  name: 'lastModified', value: new Date ('2018/06/07').getTime ()}
   ]}, 200],
   ['get pics', 'post', 'query', {}, {tags: [], sort: 'newest', from: 1, to: 10}, 200, function (s, rq, rs) {
      if (type (rs.body) !== 'object') return log ('Invalid payload.');
      if (rs.body.total !== 1) return log ('Invalid total count.');
      if (type (rs.body.pics) !== 'array') return log ('Invalid pic array.');
      var pic = rs.body.pics [0];
      s.smallpic = teishi.c (pic);
      if (pic.date !== new Date ('2018/06/07').getTime ()) return log ('Invalid pic.date');
      if (type (pic.date)   !== 'integer') return log ('Invalid pic.date.');
      if (type (pic.dateup) !== 'integer') return log ('Invalid pic.dateup.');
      delete pic.date;
      delete pic.dateup;
      if (type (pic.id) !== 'string') return log ('Invalid pic.id.');
      delete pic.id;
      if (! eq (pic, {
         owner: U [0].username.replace (' \t', ''),
         name: 'small.png',
         dimh: 149,
         dimw: 149,
         tags: [
         ]
      })) return log ('Invalid pic fields.');
      return true;
   }],
   ['upload duplicated picture', 'post', 'pic', {}, {multipart: [
      {type: 'file',  name: 'pic', path: PICS + 'smalldup.png'},
      {type: 'field',  name: 'lastModified', value: Date.now ()}
   ]}, 409],
   ['delete freshly uploaded picture', 'delete', function (s) {
      return 'pic/' + s.smallpic.id;
   }, {}, '', 200],
   ['upload small picture again', 'post', 'pic', {}, {multipart: [
      {type: 'file',  name: 'pic', path: PICS + 'small.png'},
      {type: 'field',  name: 'lastModified', value: new Date ('2018/06/07').getTime ()}
   ]}, 200],
   ['upload medium picture', 'post', 'pic', {}, {multipart: [
      {type: 'file',  name: 'pic', path: PICS + 'medium.jpg'},
      {type: 'field',  name: 'lastModified', value: new Date ('2018/06/03').getTime ()}
   ]}, 200],
   ['get pics', 'post', 'query', {}, {tags: [], sort: 'upload', from: 1, to: 10}, 200, function (s, rq, rs) {
      if (type (rs.body) !== 'object') return log ('Invalid payload.');
      if (rs.body.total !== 2) return log ('Invalid total count.');
      if (type (rs.body.pics) !== 'array') return log ('Invalid pic array.');
      var pic = rs.body.pics [0];
      if (pic.date !== new Date ('2018/06/03').getTime ()) return log ('Invalid pic.date');
      if (type (pic.dateup) !== 'integer') return log ('Invalid pic.dateup.');
      delete pic.date;
      delete pic.dateup;
      if (type (pic.id) !== 'string') return log ('Invalid pic.id.');
      delete pic.id;
      if (type (pic.t200) !== 'string') return log ('Invalid pic.t200.');
      delete pic.t200;
      if (! eq (pic, {
         owner: U [0].username.replace (' \t', ''),
         name: 'medium.jpg',
         dimh: 204,
         dimw: 248,
         tags: [
         ]
      })) return log ('Invalid pic fields.');
      return true;
   }],
   ['upload large picture', 'post', 'pic', {}, {multipart: [
      {type: 'file',  name: 'pic', path: PICS + 'large.jpeg'},
      {type: 'field',  name: 'lastModified', value: Date.now ()}
   ]}, 200],
   ['get pics', 'post', 'query', {}, {tags: [], sort: 'upload', from: 1, to: 1}, 200, function (s, rq, rs) {
      if (type (rs.body) !== 'object') return log ('Invalid payload.');
      if (rs.body.total !== 3) return log ('Invalid total count.');
      if (type (rs.body.pics) !== 'array') return log ('Invalid pic array.');
      if (rs.body.pics.length !== 1) return log ('Invalid amount of pictures returned.');
      var pic = rs.body.pics [0];
      if (pic.date !== 1405873231000) return log ('Invalid pic.date');
      delete pic.date;
      delete pic.dateup;
      delete pic.id;
      if (type (pic.t200) !== 'string') return log ('Invalid pic.t200.');
      if (type (pic.t900) !== 'string') return log ('Invalid pic.t900.');
      delete pic.t200;
      delete pic.t900;
      return true;
      if (! eq (pic, {
         owner: U [0].username.replace (' \t', ''),
         name: 'large.jpeg',
         dimh: 204,
         dimw: 248,
         tags: [
         ]
      })) return log ('Invalid pic fields.');
      return true;
   }],
   ['upload lopsided picture', 'post', 'pic', {}, {multipart: [
      {type: 'file',  name: 'pic', path: PICS + 'rotate.jpg'},
      {type: 'field',  name: 'lastModified', value: Date.now ()}
   ]}, 200],
   ['get pics', 'post', 'query', {}, {tags: [], sort: 'upload', from: 1, to: 1}, 200, function (s, rq, rs) {
      if (type (rs.body) !== 'object') return log ('Invalid payload.');
      if (rs.body.total !== 4) return log ('Invalid total count.');
      if (type (rs.body.pics) !== 'array') return log ('Invalid pic array.');
      var pic = rs.body.pics [0];
      if (type (pic.date)   !== 'integer') return log ('Invalid pic.date.');
      if (type (pic.dateup) !== 'integer') return log ('Invalid pic.dateup.');
      if (pic.date !== 1490200520000) return log ('Invalid date.');
      s.rotateid = pic.id;
      s.rotatepic = teishi.c (pic);
      delete pic.date;
      delete pic.dateup;
      if (type (pic.id) !== 'string') return log ('Invalid pic.id.');
      delete pic.id;
      if (type (pic.t200) !== 'string') return log ('Invalid pic.t200.');
      delete pic.t200;
      if (type (pic.t900) !== 'string') return log ('Invalid pic.t900.');
      delete pic.t900;
      if (! eq (pic, {
         owner: U [0].username.replace (' \t', ''),
         name: 'rotate.jpg',
         dimh: 1232,
         dimw: 2048,
         tags: [
         ]
      })) return log ('Invalid pic fields.');
      return true;
   }],
   ['rotate pic (invalid #1)', 'post', 'rotate', {}, '', 400],
   ['rotate pic (invalid #2)', 'post', 'rotate', {}, [], 400],
   ['rotate pic (invalid #3)', 'post', 'rotate', {}, {}, 400],
   ['rotate pic (invalid #4)', 'post', 'rotate', {}, {id: 1, deg: 20}, 400],
   ['rotate pic (invalid #5)', 'post', 'rotate', {}, {id: 'hello'}, 400],
   ['rotate pic (invalid #6)', 'post', 'rotate', {}, {deg: 90}, 400],
   ['rotate pic (invalid #7)', 'post', 'rotate', {}, {id: 'hello', deg: 45}, 400],
   ['rotate pic (invalid #8)', 'post', 'rotate', {}, {id: 'hello', deg: -90}, 404],
   ['rotate pic', 'post', 'rotate', {}, function (s) {
      return {id: s.rotateid, deg: 90};
   }, 200],
   ['get pics', 'post', 'query', {}, {tags: [], sort: 'upload', from: 1, to: 1}, 200, function (s, rq, rs) {
      var pic = rs.body.pics [0];
      delete pic.id;
      if (type (pic.t200) !== 'string') return log ('Invalid pic.t200.');
      delete pic.t200;
      if (type (pic.t900) !== 'string') return log ('Invalid pic.t900.');
      delete pic.t900;
      if (s.rotatepic.date !== pic.date)     return log ('date changed after rotate.');
      if (s.rotatepic.dateup !== pic.dateup) return log ('dateup changed after rotate.');
      delete pic.date;
      delete pic.dateup;
      if (! eq (pic, {
         owner: U [0].username.replace (' \t', ''),
         name: 'rotate.jpg',
         dimw: 1232,
         dimh: 2048,
         tags: [
         ]
      })) return log ('Invalid pic fields.');
      return true;
   }],
   ['get pics by newest', 'post', 'query', {}, {tags: [], sort: 'newest', from: 1, to: 4}, 200, function (s, rq, rs) {
      if (! eq (['small.png', 'medium.jpg', 'rotate.jpg', 'large.jpeg'], dale.do (rs.body.pics, function (v) {
         return v.name;
      }))) return log ('Invalid pic date sorting');
      return true;
   }],
   ['get pics by oldest', 'post', 'query', {}, {tags: [], sort: 'oldest', from: 1, to: 4}, 200, function (s, rq, rs) {
      if (! eq (['large.jpeg', 'rotate.jpg', 'medium.jpg', 'small.png'], dale.do (rs.body.pics, function (v) {
         return v.name;
      }))) return log ('Invalid pic date sorting');
      return true;
   }],
   ['get pics by mindate #1', 'post', 'query', {}, {tags: [], sort: 'newest', from: 1, to: 4, mindate: 1490200520000}, 200, function (s, rq, rs) {
      if (! eq (['small.png', 'medium.jpg', 'rotate.jpg'], dale.do (rs.body.pics, function (v) {
         return v.name;
      }))) return log ('Invalid pic date sorting');
      return true;
   }],
   ['get pics by mindate #2', 'post', 'query', {}, {tags: [], sort: 'oldest', from: 1, to: 4, mindate: 1490200520000}, 200, function (s, rq, rs) {
      if (! eq (['rotate.jpg', 'medium.jpg', 'small.png'], dale.do (rs.body.pics, function (v) {
         return v.name;
      }))) return log ('Invalid pic date sorting');
      return true;
   }],
   ['get pics by maxdate #1', 'post', 'query', {}, {tags: [], sort: 'newest', from: 1, to: 4, maxdate: 1490200520000}, 200, function (s, rq, rs) {
      if (! eq (['rotate.jpg', 'large.jpeg'], dale.do (rs.body.pics, function (v) {
         return v.name;
      }))) return log ('Invalid pic date sorting');
      return true;
   }],
   ['get pics by maxdate #2', 'post', 'query', {}, {tags: [], sort: 'oldest', from: 1, to: 4, maxdate: 1490200520000}, 200, function (s, rq, rs) {
      if (! eq (['large.jpeg', 'rotate.jpg'], dale.do (rs.body.pics, function (v) {
         return v.name;
      }))) return log ('Invalid pic date sorting');
      return true;
   }],
   ['get pics by year #1', 'post', 'query', {}, {tags: ['2018'], sort: 'newest', from: 1, to: 4, maxdate: 1490200520000}, 400],
   ['get pics by year #2', 'post', 'query', {}, {tags: ['2018'], sort: 'newest', from: 1, to: 4, mindate: 1490200520000}, 400],
   ['get pics by year #3', 'post', 'query', {}, {tags: ['2018'], sort: 'newest', from: 1, to: 4}, 200, function (s, rq, rs) {
      if (! eq (['small.png', 'medium.jpg'], dale.do (rs.body.pics, function (v) {
         return v.name;
      }))) return log ('Invalid pic date sorting');
      return true;
   }],
   ['get pics by year #4', 'post', 'query', {}, {tags: ['2018'], sort: 'oldest', from: 1, to: 4}, 200, function (s, rq, rs) {
      if (! eq (['medium.jpg', 'small.png'], dale.do (rs.body.pics, function (v) {
         return v.name;
      }))) return log ('Invalid pic date sorting');
      return true;
   }],
   ['get pics by year #5', 'post', 'query', {}, {tags: ['2017', '2018'], sort: 'newest', from: 1, to: 4}, 200, function (s, rq, rs) {
      if (! eq (['small.png', 'medium.jpg', 'rotate.jpg'], dale.do (rs.body.pics, function (v) {
         return v.name;
      }))) return log ('Invalid pic date sorting');
      return true;
   }],
   ['get pics by year #6', 'post', 'query', {}, {tags: ['2017', '2014', '2015'], sort: 'newest', from: 1, to: 4}, 200, function (s, rq, rs) {
      if (! eq (['rotate.jpg', 'large.jpeg'], dale.do (rs.body.pics, function (v) {
         return v.name;
      }))) return log ('Invalid pic date sorting');
      return true;
   }],
   ['get tags', 'get', 'tags', {}, '', 200, function (s, rq, rs) {
      if (! eq (rs.body, {all: 4, untagged: 4})) return log (rs.body);
      return true;
   }],
   ['tag invalid #1', 'post', 'tag', {}, '', 400],
   ['tag invalid #2', 'post', 'tag', {}, {}, 400],
   ['tag invalid #3', 'post', 'tag', {}, [], 400],
   ['tag invalid #4', 'post', 'tag', {}, {tag: 22, ids: []}, 400],
   ['tag invalid #5', 'post', 'tag', {}, {tag: 'foo', ids: ''}, 400],
   ['tag invalid #6', 'post', 'tag', {}, {tag: 'foo', ids: {}}, 400],
   ['tag invalid #7', 'post', 'tag', {}, {tag: 'foo', ids: ['a', 'b', 2]}, 400],
   ['tag invalid #8', 'post', 'tag', {}, {tag: 'foo', ids: ['a', 'b'], del: 1}, 400],
   ['tag valid empty', 'post', 'tag', {}, {tag: 'foo', ids: []}, 200],
   ['tag valid empty', 'post', 'tag', {}, {tag: 'foo', ids: [], del: true}, 200],
   ['get tags', 'get', 'tags', {}, '', 200, function (s, rq, rs) {
      if (! eq (rs.body, {all: 4, untagged: 4})) return log (rs.body);
      return true;
   }],
   ['tag valid #1', 'post', 'tag', {}, {tag: 'foo', ids: []}, 200],
   ['tag valid #2', 'post', 'tag', {}, {tag: 'foo', ids: ['a', 'b']}, 200],
   ['get tags', 'get', 'tags', {}, '', 200, function (s, rq, rs) {
      if (! eq (rs.body, {all: 4, untagged: 4})) return log (rs.body);
      return true;
   }],
   ['get pics', 'post', 'query', {}, {tags: [], sort: 'newest', from: 1, to: 4}, 200, function (s, rq, rs) {
      s.pics = rs.body.pics;
      return true;
   }],
   dale.do (dale.times (4, 0), function (k) {
      return [
         ['get pic #' + (k + 1), 'get', function (s) {
            return 'pic/' + s.pics [k].id;
         }, {}, '', 200],
         k === 0 ? [] : ['get thumb 200 #' + (k + 1), 'get', function (s) {
            return 'thumb/' + s.pics [k].t200;
         }, {}, '', 200],
         k === 0 ? [] : ['get thumb 900 #' + (k + 1), 'get', function (s) {
            return 'thumb/' + s.pics [k].t200;
         }, {}, '', 200],
      ];
   }),

   ['tag valid #3', 'post', 'tag', {}, function (s) {
      return {tag: 'foo', ids: [s.pics [0].id, 'b']};
   }, 200],
   ['get tags', 'get', 'tags', {}, '', 200, function (s, rq, rs) {
      if (! eq (rs.body, {all: 4, untagged: 3, foo: 1})) return log (rs.body);
      return true;
   }],
   ['get tagged pic', 'post', 'query', {}, {tags: [], sort: 'newest', from: 1, to: 4}, 200, function (s, rq, rs) {
      if (! eq (rs.body.pics [0].tags, ['foo'])) return log ('Invalid tags');
      return true;
   }],
   ['tag valid #4', 'post', 'tag', {}, function (s) {
      return {tag: 'foo', ids: [s.pics [0].id]};
   }, 200],
   ['get tags', 'get', 'tags', {}, '', 200, function (s, rq, rs) {
      if (! eq (rs.body, {all: 4, untagged: 3, foo: 1})) return log (rs.body);
      return true;
   }],
   ['get tagged pic', 'post', 'query', {}, {tags: [], sort: 'newest', from: 1, to: 4}, 200, function (s, rq, rs) {
      if (! eq (rs.body.pics [0].tags, ['foo'])) return log ('Invalid tags');
      return true;
   }],
   ['get tagged pic', 'post', 'query', {}, {tags: ['foo'], sort: 'newest', from: 1, to: 4}, 200, function (s, rq, rs) {
      if (rs.body.total !== 1) return log ('Searching by tag does not work.');
      if (! eq (rs.body.pics [0].tags, ['foo'])) return log ('Invalid tags');
      return true;
   }],
   ['untag #1', 'post', 'tag', {}, function (s) {
      return {tag: 'foo', ids: ['bla', s.pics [0].id, s.pics [1].id, 'foo'], del: true};
   }, 200],
   ['get tags', 'get', 'tags', {}, '', 200, function (s, rq, rs) {
      if (! eq (rs.body, {all: 4, untagged: 4})) return log (rs.body);
      return true;
   }],
   ['get pic after untagging', 'post', 'query', {}, {tags: [], sort: 'newest', from: 1, to: 4}, 200, function (s, rq, rs) {
      if (! eq (rs.body.pics [0].tags, [])) return log ('Invalid tags');
      return true;
   }],
   ['get tagged pic after untagging', 'post', 'query', {}, {tags: ['foo'], sort: 'newest', from: 1, to: 4}, 200, function (s, rq, rs) {
      if (rs.body.total !== 0) return log ('Searching by tag does not work.');
      return true;
   }],
   ['tag two pics', 'post', 'tag', {}, function (s) {
      return {tag: 'bla', ids: [s.pics [0].id, s.pics [3].id, s.pics [3].id]};
   }, 200],
   ['get tags', 'get', 'tags', {}, '', 200, function (s, rq, rs) {
      if (! eq (rs.body, {all: 4, untagged: 2, bla: 2})) return log (rs.body);
      return true;
   }],
   ['get tagged pics', 'post', 'query', {}, {tags: [], sort: 'newest', from: 1, to: 4}, 200, function (s, rq, rs) {
      if (! eq (rs.body.pics [0].tags, ['bla'])) return log ('Invalid tags');
      if (! eq (rs.body.pics [3].tags, ['bla'])) return log ('Invalid tags');
      return true;
   }],
   ['untag tag two pics with tag they don\'t have', 'post', 'tag', {}, function (s) {
      return {tag: 'blablabla', ids: ['foo', s.pics [0].id, s.pics [3].id, s.pics [3].id], del: true};
   }, 200],
   ['get tags', 'get', 'tags', {}, '', 200, function (s, rq, rs) {
      if (! eq (rs.body, {all: 4, untagged: 2, bla: 2})) return log (rs.body);
      return true;
   }],
   ['untag two pics', 'post', 'tag', {}, function (s) {
      return {tag: 'bla', ids: ['foo', s.pics [0].id, s.pics [3].id, s.pics [3].id], del: true};
   }, 200],
   ['get tagged pics after untagging', 'post', 'query', {}, {tags: ['bla'], sort: 'upload', from: 1, to: 4}, 200, function (s, rq, rs) {
      if (rs.body.total !== 0) return log ('Searching by tag does not work.');
      return true;
   }],
   ['get tags', 'get', 'tags', {}, '', 200, function (s, rq, rs) {
      if (! eq (rs.body, {all: 4, untagged: 4})) return log (rs.body);
      return true;
   }],
   ['tag two pics', 'post', 'tag', {}, function (s) {
      return {tag: 'bla', ids: [s.pics [0].id, s.pics [3].id, s.pics [3].id]};
   }, 200],
   ['delete tagged picture', 'delete', function (s) {
      return 'pic/' + s.pics [3].id;
   }, {}, '', 200],
   ['get tags', 'get', 'tags', {}, '', 200, function (s, rq, rs) {
      if (! eq (rs.body, {all: 3, untagged: 2, bla: 1})) return log (rs.body);
      return true;
   }],
   ['get pics', 'post', 'query', {}, {tags: [], sort: 'upload', from: 1, to: 10}, 200, function (s, rq, rs) {
      s.pics = rs.body.pics;
      return true;
   }],
   ['signup for the first time', 'post', 'auth/signup', {}, function (s) {
      return {username: U [1].username, password: U [1].password, token: s.itoken2, email: 'b@b.com'};
   }, 200, function (s, rq, rs) {
      s.vtoken2 = rs.body.token;
      return true;
   }],
   ['verify user', 'get', function (s) {return 'auth/verify/' + s.vtoken2}, {}, '', 302],
   ['share invalid payload #1', 'post', 'share', {}, {}, 400],
   ['share invalid payload #2', 'post', 'share', {}, [], 400],
   ['share invalid payload #3', 'post', 'share', {}, {tag: 'bla'}, 400],
   ['share invalid payload #4', 'post', 'share', {}, {who: U [1].username}, 400],
   ['share invalid payload #5', 'post', 'share', {}, {tag: 'bla', who: 2}, 400],
   ['share invalid payload #6', 'post', 'share', {}, {tag: 'bla', who: U [1].username, del: 1}, 400],
   ['share invalid tag', 'post', 'share', {}, {tag: 'all', who: U [1].username}, 400],
   ['share invalid tag', 'post', 'share', {}, {tag: 'untagged', who: U [1].username}, 400],
   ['share with no such user', 'post', 'share', {}, {tag: 'bla', who: U [1].username + 'a'}, 404],
   ['share a tag with no such user', 'post', 'share', {}, {tag: 'bla', who: U [1].username + 'a'}, 404],
   ['get shared tags before sharing', 'get', 'share', {}, '', 200, function (s, rq, rs) {
      if (! eq (rs.body, {sho: [], shm: []})) return log ('Invalid body', rs.body);
      return true;
   }],
   ['share a tag with a user', 'post', 'share', {}, {tag: 'bla', who: U [1].username}, 200],
   ['get shared tags after', 'get', 'share', {}, '', 200, function (s, rq, rs) {
      if (! eq (rs.body, {sho: [[U [1].username, 'bla']], shm: []})) return log ('Invalid body', rs.body);
      return true;
   }],
   ['login with valid credentials as user2', 'post', 'auth/login', {}, U [1], 200, function (state, request, response) {
      state.headers = {cookie: response.headers.cookie};
      return response.headers.cookie !== undefined;
   }],
   ['get shared tags as user2', 'get', 'share', {}, '', 200, function (s, rq, rs) {
      if (! eq (rs.body, {shm: [[U [0].username.replace (' \t', ''), 'bla']], sho: []})) return log ('Invalid body', rs.body);
      return true;
   }],
   ['get pics as user2', 'post', 'query', {}, {tags: [], sort: 'upload', from: 1, to: 10}, 200, function (s, rq, rs) {
      if (rs.body.pics.length !== 1) return log ('user2 should have one pic');
      s.shared = rs.body.pics [0];
      return true;
   }],
   ['get pics as user2 with tag', 'post', 'query', {}, {tags: ['bla'], sort: 'upload', from: 1, to: 10}, 200, function (s, rq, rs) {
      if (rs.body.pics.length !== 1) return log ('user2 should have one pic with this tag');
      return true;
   }],
   ['get shared pic as user2', 'get', function (s) {
      return 'pic/' + s.shared.id;
   }, {}, '', 200],
   ['fail getting nonshared pic as user2', 'get', function (s) {
      return 'pic/' + s.pics [0].id;
   }, {}, '', 404],
   ['login with valid credentials as user1', 'post', 'auth/login', {}, U [0], 200, function (state, request, response) {
      state.headers = {cookie: response.headers.cookie};
      return response.headers.cookie !== undefined;
   }],
   ['tag rotated picture', 'post', 'tag', {}, function (s) {
      return dale.stopNot (s.pics, undefined, function (pic) {
         if (pic.name === 'rotate.jpg') return {tag: 'rotate', ids: [pic.id]};
      });
   }, 200],
   ['get tags', 'get', 'tags', {}, '', 200, function (s, rq, rs) {
      return true;
   }],
   ['share rotate tag with a user', 'post', 'share', {}, {tag: 'rotate', who: U [1].username}, 200],
   ['login with valid credentials as user2', 'post', 'auth/login', {}, U [1], 200, function (state, request, response) {
      state.headers = {cookie: response.headers.cookie};
      return response.headers.cookie !== undefined;
   }],
   ['get pics as user2', 'post', 'query', {}, {tags: [], sort: 'upload', from: 1, to: 10}, 200, function (s, rq, rs) {
      if (rs.body.pics.length !== 2) return log ('user2 should have two pics.');
      s.pics2 = rs.body.pics;
      return true;
   }],
   ['get `rotate` pics as user2', 'post', 'query', {}, {tags: ['rotate'], sort: 'upload', from: 1, to: 10}, 200, function (s, rq, rs) {
      if (rs.body.pics.length !== 1) return log ('user2 should have one `rotate` pic.');
      return true;
   }],
   dale.do (dale.times (2, 0), function (k) {
      return [
         ['get pic #' + (k + 1), 'get', function (s) {
            return 'pic/' + s.pics2 [k].id;
         }, {}, '', 200],
         k === 1 ? [] : ['get thumb 200 #' + (k + 1), 'get', function (s) {
            return 'thumb/' + s.pics2 [k].t200;
         }, {}, '', 200],
         k === 1 ? [] : ['get thumb 900 #' + (k + 1), 'get', function (s) {
            return 'thumb/' + s.pics2 [k].t200;
         }, {}, '', 200],
      ];
   }),
   ['upload lopsided picture as user2', 'post', 'pic', {}, {multipart: [
      {type: 'file',  name: 'pic', path: PICS + 'rotate.jpg'},
      {type: 'field',  name: 'lastModified', value: Date.now ()}
   ]}, 200],
   ['get all pics as user2', 'post', 'query', {}, {tags: [], sort: 'upload', from: 1, to: 10}, 200, function (s, rq, rs) {
      if (rs.body.pics.length !== 2) return log ('user2 should have two pics.');
      if (rs.body.total !== 2) return log ('total not computed properly with repeated pics.');
      if (rs.body.pics [0].id === s.pics2 [0].id) return log ('user2 should have own picture as priority.');
      s.rotate2 = rs.body.pics [0];
      return true;
   }],
   ['tag rotated picture', 'post', 'tag', {}, function (s) {
      return {tag: 'rotate', ids: [s.rotate2.id]};
   }, 200],
   ['get `rotate` pics as user2', 'post', 'query', {}, {tags: ['rotate'], sort: 'upload', from: 1, to: 10}, 200, function (s, rq, rs) {
      if (rs.body.pics.length !== 1) return log ('user2 should have one `rotate` pic.');
      if (rs.body.total !== 1) return log ('total not computed properly with repeated pics.');
      if (rs.body.pics [0].id === s.pics2 [0].id) return log ('user2 should have own picture as priority.');
      s.repeated = rs.body.pics [0].id;
      return true;
   }],
   ['share rotate tag with user1', 'post', 'share', {}, {tag: 'rotate', who: U [0].username.replace (' \t', '')}, 200],
   ['get `rotate` pics as user2 after sharing', 'post', 'query', {}, {tags: ['rotate'], sort: 'upload', from: 1, to: 10}, 200, function (s, rq, rs) {
      if (rs.body.pics.length !== 1) return log ('user2 should have one `rotate` pic.');
      if (rs.body.pics [0].id === s.pics2 [0].id) return log ('user2 should have own picture as priority.');
      return true;
   }],
   ['login as user1', 'post', 'auth/login', {}, U [0], 200, function (state, request, response) {
      state.headers = {cookie: response.headers.cookie};
      return response.headers.cookie !== undefined;
   }],
   ['get `rotate` pics as user1 after sharing', 'post', 'query', {}, {tags: ['rotate'], sort: 'upload', from: 1, to: 10}, 200, function (s, rq, rs) {
      if (rs.body.pics.length !== 1) return log ('user1 should have one `rotate` pic.');
      if (rs.body.pics [0].id !== s.pics2 [0].id) return log ('user1 should have own picture as priority.');
      return true;
   }],
   ['get all pics as user1 after sharing', 'post', 'query', {}, {tags: [], sort: 'upload', from: 1, to: 10}, 200, function (s, rq, rs) {
      if (rs.body.pics.length !== 3) return log ('user1 should have one `rotate` pic.');
      return true;
   }],
   ['login as user2', 'post', 'auth/login', {}, U [1], 200, function (state, request, response) {
      state.headers = {cookie: response.headers.cookie};
      return response.headers.cookie !== undefined;
   }],
   ['unshare user1', 'post', 'share', {}, {tag: 'rotate', who: U [0].username.replace (' \t', ''), del: true}, 200],
   ['login as user1', 'post', 'auth/login', {}, U [0], 200, function (state, request, response) {
      state.headers = {cookie: response.headers.cookie};
      return response.headers.cookie !== undefined;
   }],
   ['get `rotate` pics as user1 after unsharing', 'post', 'query', {}, {tags: ['rotate'], sort: 'upload', from: 1, to: 10}, 200, function (s, rq, rs) {
      if (rs.body.pics.length !== 1) return log ('user1 should have one `rotate` pic.');
      if (rs.body.pics [0].id !== s.pics2 [0].id) return log ('user1 should have own picture after unsharing.');
      return true;
   }],
   ['login as user2', 'post', 'auth/login', {}, U [1], 200, function (state, request, response) {
      state.headers = {cookie: response.headers.cookie};
      return response.headers.cookie !== undefined;
   }],
   ['delete pic as user2', 'delete', function (s) {
      return 'pic/' + s.rotate2.id;
   }, {}, '', 200],
   ['delete account', 'post', 'auth/delete', {}, {}, 302],
   ['login as user1', 'post', 'auth/login', {}, U [0], 200, function (state, request, response) {
      state.headers = {cookie: response.headers.cookie};
      return response.headers.cookie !== undefined;
   }],
   dale.do (dale.times (3, 0), function (k) {
      return ['delete pic #' + (k + 1), 'delete', function (s) {
         return 'pic/' + s.pics [k].id;
      }, {}, '', 200];
   }),
   ['get pics', 'post', 'query', {}, {tags: [], sort: 'newest', from: 1, to: 10}, 200, function (s, rq, rs) {
      if (rs.body.total !== 0) return log ('Some pictures were not deleted.');
      return true;
   }],
   ['get tags', 'get', 'tags', {}, '', 200, function (s, rq, rs) {
      if (! eq (rs.body, {all: 0})) return log (rs.body);
      return true;
   }],
   ['unshare as user1 after user was deleted', 'post', 'share', {}, {tag: 'bla', who: U [1].username, del: true}, 404],
   ['get stats after test', 'get', 'admin/stats', {}, '', 200, function (s, rq, rs) {
      if (type (rs.body) !== 'array') return log ('Invalid body', rs.body);
      return true;
   }],
];

h.seq ({host: CONFIG.host, port: CONFIG.port}, [
   intro,
   main,
   outro,
], function (error) {
   if (error) {
      if (error.request && error.request.body && type (error.request.body) === 'string') error.request.body = error.request.body.slice (0, 1000) + (error.request.body.length > 1000 ? '... OMITTING REMAINDER' : '');
      return log ('FINISHED WITH AN ERROR', error);
   }
   log ('ALL TESTS FINISHED SUCCESSFULLY!');
}, h.stdmap);