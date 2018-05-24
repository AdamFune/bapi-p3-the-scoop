// database is let instead of const to allow us to modify it in test.js
let database = {
  users: {},
  articles: {},
  nextArticleId: 1,
  comments: {},
  nextCommentId: 1
};

const routes = {
  '/users': {
    'POST': getOrCreateUser
  },
  '/users/:username': {
    'GET': getUser
  },
  '/articles': {
    'GET': getArticles,
    'POST': createArticle
  },
  '/articles/:id': {
    'GET': getArticle,
    'PUT': updateArticle,
    'DELETE': deleteArticle
  },
  '/articles/:id/upvote': {
    'PUT': upvoteArticle
  },
  '/articles/:id/downvote': {
    'PUT': downvoteArticle
  },
  '/comments': {
    'POST': addNewComment
  },
  '/comments/:id': {
    'PUT': editComment,
    'DELETE': deleteComment
  },
  '/comments/:id/upvote': {
    'PUT': upvoteComment
  },
  '/comments/:id/downvote': {
    'PUT': downvoteComment
  }
};

function getUser(url, request) {
  const username = url.split('/').filter(segment => segment)[1];
  const user = database.users[username];
  const response = {};

  if (user) {
    const userArticles = user.articleIds.map(
        articleId => database.articles[articleId]);
    const userComments = user.commentIds.map(
        commentId => database.comments[commentId]);
    response.body = {
      user: user,
      userArticles: userArticles,
      userComments: userComments
    };
    response.status = 200;
  } else if (username) {
    response.status = 404;
  } else {
    response.status = 400;
  }

  return response;
}

function getOrCreateUser(url, request) {
  const username = request.body && request.body.username;
  const response = {};

  if (database.users[username]) {
    response.body = {user: database.users[username]};
    response.status = 200;
  } else if (username) {
    const user = {
      username: username,
      articleIds: [],
      commentIds: []
    };
    database.users[username] = user;

    response.body = {user: user};
    response.status = 201;
  } else {
    response.status = 400;
  }

  return response;
}

function getArticles(url, request) {
  const response = {};

  response.status = 200;
  response.body = {
    articles: Object.keys(database.articles)
        .map(articleId => database.articles[articleId])
        .filter(article => article)
        .sort((article1, article2) => article2.id - article1.id)
  };

  return response;
}

function getArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const article = database.articles[id];
  const response = {};

  if (article) {
    article.comments = article.commentIds.map(
      commentId => database.comments[commentId]);

    response.body = {article: article};
    response.status = 200;
  } else if (id) {
    response.status = 404;
  } else {
    response.status = 400;
  }

  return response;
}

function createArticle(url, request) {
  const requestArticle = request.body && request.body.article;
  const response = {};

  if (requestArticle && requestArticle.title && requestArticle.url &&
      requestArticle.username && database.users[requestArticle.username]) {
    const article = {
      id: database.nextArticleId++,
      title: requestArticle.title,
      url: requestArticle.url,
      username: requestArticle.username,
      commentIds: [],
      upvotedBy: [],
      downvotedBy: []
    };

    database.articles[article.id] = article;
    database.users[article.username].articleIds.push(article.id);

    response.body = {article: article};
    response.status = 201;
  } else {
    response.status = 400;
  }

  return response;
}

function updateArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const savedArticle = database.articles[id];
  const requestArticle = request.body && request.body.article;
  const response = {};

  if (!id || !requestArticle) {
    response.status = 400;
  } else if (!savedArticle) {
    response.status = 404;
  } else {
    savedArticle.title = requestArticle.title || savedArticle.title;
    savedArticle.url = requestArticle.url || savedArticle.url;

    response.body = {article: savedArticle};
    response.status = 200;
  }

  return response;
}

function deleteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const savedArticle = database.articles[id];
  const response = {};

  if (savedArticle) {
    database.articles[id] = null;
    savedArticle.commentIds.forEach(commentId => {
      const comment = database.comments[commentId];
      database.comments[commentId] = null;
      const userCommentIds = database.users[comment.username].commentIds;
      userCommentIds.splice(userCommentIds.indexOf(id), 1);
    });
    const userArticleIds = database.users[savedArticle.username].articleIds;
    userArticleIds.splice(userArticleIds.indexOf(id), 1);
    response.status = 204;
  } else {
    response.status = 400;
  }

  return response;
}

function upvoteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const username = request.body && request.body.username;
  let savedArticle = database.articles[id];
  const response = {};

  if (savedArticle && database.users[username]) {
    savedArticle = upvote(savedArticle, username);

    response.body = {article: savedArticle};
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

function downvoteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const username = request.body && request.body.username;
  let savedArticle = database.articles[id];
  const response = {};

  if (savedArticle && database.users[username]) {
    savedArticle = downvote(savedArticle, username);

    response.body = {article: savedArticle};
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

function upvote(item, username) {
  if (item.downvotedBy.includes(username)) {
    item.downvotedBy.splice(item.downvotedBy.indexOf(username), 1);
  }
  if (!item.upvotedBy.includes(username)) {
    item.upvotedBy.push(username);
  }
  return item;
}

function downvote(item, username) {
  if (item.upvotedBy.includes(username)) {
    item.upvotedBy.splice(item.upvotedBy.indexOf(username), 1);
  }
  if (!item.downvotedBy.includes(username)) {
    item.downvotedBy.push(username);
  }
  return item;
}

//Functions added:
function addNewComment(string, request) {

    //Response:
  let response = {
    status: 201
  };

    //Edge cases:
  if (!(request.body)|| !(request.body.comment)|| !(request.body.comment.body)||
      !(request.body.comment.username) || !(request.body.comment.articleId)||
      !(database.users[request.body.comment.username])||
      !(database.articles[request.body.comment.articleId])) {
    response['status'] = 400
    return response;
  } else if (!(string && request.body)) {
    response['status'] = 400
    return response;
  } else {
    response['body'] =
      {comment: {
        id: database.nextCommentId,
        body: request.body.comment.body,
        username: request.body.comment.username,
        articleId: request.body.comment.articleId,
        upvotedBy: [],
        downvotedBy: []
      }
    }
  };


        //Creation of comment:
  database.comments[database.nextCommentId] = {
    id: database.nextCommentId,
    body: request.body.comment.body,
    username: request.body.comment.username
  };
        //Adds comment ID to articles object
  if (database.articles[request.body.comment.articleId]['commentIds']) {
    database.articles[request.body.comment.articleId]['commentIds'].push(database.nextCommentId);
  } else {
    database.articles[request.body.comment.articleId]['commentIds'] = [];
    database.articles[request.body.comment.articleId]['commentIds'].push(database.nextCommentId);
  };
      //Adds comment ID to users object
  if (database.users[request.body.comment.username]['commentIds']) {
    database.users[request.body.comment.username]['commentIds'].push(database.nextCommentId);
  } else {
    database.users[request.body.comment.username]['commentIds'] = [];
    database.users[request.body.comment.username]['commentIds'].push(database.nextCommentId);
  };

  database.nextCommentId++; //Keep this the last step

  return response
}

function editComment(string, request) {
  let split = string.split('/')
  let requestedId = split[split.length - 1]
  let response = {
    status: 200
  };
  if (!(request.body)|| !(request.body.comment)|| !(request.body.comment.body)||
      !(request.body.comment.username)) {
    response['status'] = 400
    return response;
  };

  if (!database.comments[requestedId]) {
    response['status'] = 404
    return response;
  };

  database.comments[requestedId].body = request.body.comment.body

  return response;
}

function deleteComment(string) {
  let response = {
    status: 204
  };
  let split = string.split('/')
  let requestedId = Number(split[split.length - 1])

  if (!(database.comments[requestedId])) {
    response['status'] = 404;
    return response;
  }

  database.comments[requestedId] = null;
  function idFilter(id) {
    if (requestedId !== id) {
      return id;
    };
  }
  Object.getOwnPropertyNames(database.users).forEach(function(username) {
    database.users[username].commentIds = database.users[username].commentIds.filter(idFilter)
  });

  Object.getOwnPropertyNames(database.articles).forEach( function(articleId) {
    database.articles[articleId].commentIds = database.articles[articleId].commentIds.filter(idFilter)
  });
  return response
}

function upvoteComment(url, request) {
  let split = url.split('/');
  let requestedId = split[split.length - 2];

  let response = {
    status: 200,
    body: {}
  };

  if (!(request.body) || !(request.body.username)|| !(database.users[request.body.username])||
      !(database.comments[requestedId])) {
    response['status'] = 400
    return response;
  }

  if (!(database.comments[requestedId].upvotedBy)) {
    database.comments[requestedId].upvotedBy = []
  };

  if (!(database.comments[requestedId].downvotedBy)) {
    database.comments[requestedId].downvotedBy = []
  };

  if (database.comments[requestedId].upvotedBy.includes(request.body.username)) {
      //skips step if the user has already upvoted
  } else if (database.comments[requestedId].upvotedBy) {
    response.body['comment'] = database.comments[requestedId]
    database.comments[requestedId].upvotedBy.push(request.body.username);
    database.comments[requestedId].downvotedBy = database.comments[requestedId].downvotedBy.filter(users => users !== request.body.username);
  } else {
    response.body['comment'] = database.comments[requestedId]
    database.comments[requestedId]['upvotedBy'] = [];
    database.comments[requestedId].upvotedBy.push(request.body.username);
    database.comments[requestedId].downvotedBy = database.comments[requestedId].downvotedBy.filter(users => users !== request.body.username);
  };
  return response
}

function downvoteComment(url, request) {
  let split = url.split('/');
  let requestedId = split[split.length - 2];

  let response = {
    status: 200,
    body: {}
  };

  if (!(request.body) || !(request.body.username)|| !(database.users[request.body.username])||
      !(database.comments[requestedId])) {
    response['status'] = 400
    return response;
  }

  if (!(database.comments[requestedId].upvotedBy)) {
    database.comments[requestedId].upvotedBy = []
  };

  if (!(database.comments[requestedId].downvotedBy)) {
    database.comments[requestedId].downvotedBy = []
  };

  if (database.comments[requestedId].downvotedBy.includes(request.body.username)) {
  //skips step if the user has already upvoted
  } else if (database.comments[requestedId].upvotedBy) {
    response.body['comment'] = database.comments[requestedId]
    database.comments[requestedId].downvotedBy.push(request.body.username);
    database.comments[requestedId].upvotedBy = database.comments[requestedId].upvotedBy.filter(users => users !== request.body.username);
  } else {
    response.body['comment'] = database.comments[requestedId]
    database.comments[requestedId]['downvotedBy'] = [];
    database.comments[requestedId].downvotedBy.push(request.body.username);
    database.comments[requestedId].upvotedBy = database.comments[requestedId].upvotedBy.filter(users => users !== request.body.username);
  };
  return response
}

//BONUS SECTION:
const yaml = require('js-yaml');
const fs = require('fs')

function loadDatabase() {
  //Reads a YAML file containing the database and returns a JavaScript Object
  try {
    const yamlDatabase = yaml.safeLoad(fs.readFileSync('database.yml', 'utf8'));
    if (yamlDatabase) {
      database = yamlDatabase};
    console.log(yamlDatabase);
  } catch (e) {
    console.log(e);
  };
}

function saveDatabase() {
  //Writes the current value of database to a YAML file
  try {
    fs.writeFile('database.yml', yaml.safeDump(database), function (err) {
      if(err) throw err;
      console.log('Saved');
    });
  } catch (e) {
    console.log(e)
  }
}


// Write all code above this line.

const http = require('http');
const url = require('url');

const port = process.env.PORT || 4000;
const isTestMode = process.env.IS_TEST_MODE;

const requestHandler = (request, response) => {
  const url = request.url;
  const method = request.method;
  const route = getRequestRoute(url);

  if (method === 'OPTIONS') {
    var headers = {};
    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
    headers["Access-Control-Allow-Credentials"] = false;
    headers["Access-Control-Max-Age"] = '86400'; // 24 hours
    headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
    response.writeHead(200, headers);
    return response.end();
  }

  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader(
      'Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  if (!routes[route] || !routes[route][method]) {
    response.statusCode = 400;
    return response.end();
  }

  if (method === 'GET' || method === 'DELETE') {
    const methodResponse = routes[route][method].call(null, url);
    !isTestMode && (typeof saveDatabase === 'function') && saveDatabase();

    response.statusCode = methodResponse.status;
    response.end(JSON.stringify(methodResponse.body) || '');
  } else {
    let body = [];
    request.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = JSON.parse(Buffer.concat(body).toString());
      const jsonRequest = {body: body};
      const methodResponse = routes[route][method].call(null, url, jsonRequest);
      !isTestMode && (typeof saveDatabase === 'function') && saveDatabase();

      response.statusCode = methodResponse.status;
      response.end(JSON.stringify(methodResponse.body) || '');
    });
  }
};

const getRequestRoute = (url) => {
  const pathSegments = url.split('/').filter(segment => segment);

  if (pathSegments.length === 1) {
    return `/${pathSegments[0]}`;
  } else if (pathSegments[2] === 'upvote' || pathSegments[2] === 'downvote') {
    return `/${pathSegments[0]}/:id/${pathSegments[2]}`;
  } else if (pathSegments[0] === 'users') {
    return `/${pathSegments[0]}/:username`;
  } else {
    return `/${pathSegments[0]}/:id`;
  }
}

if (typeof loadDatabase === 'function' && !isTestMode) {
  const savedDatabase = loadDatabase();
  if (savedDatabase) {
    for (key in database) {
      database[key] = savedDatabase[key] || database[key];
    }
  }
}

const server = http.createServer(requestHandler);

server.listen(port, (err) => {
  if (err) {
    return console.log('Server did not start succesfully: ', err);
  }

  console.log(`Server is listening on ${port}`);
});
