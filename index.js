const bodyParser = require('body-parser');
const express = require('express');
const Prismic = require('prismic.io');
const mcache = require('memory-cache');

const app = express();

app.set('views', 'layouts');
app.set('view engine', 'pug');
app.use(bodyParser.json());
app.use('/static', express.static('static'));

const cTime = 60 * 60 * 24;

function formatDate(date) {
  var monthNames = [
    "January", "February", "March",
    "April", "May", "June", "July",
    "August", "September", "October",
    "November", "December"
  ];

  var day = date.getDate();
  var monthIndex = date.getMonth();
  var year = date.getFullYear();

  return day + ' ' + monthNames[monthIndex] + ' ' + year;
}


function resolve(doc) {
  if (doc.type !== 'article') {
    return '/' + doc.uid;
  }
  return '/article/' + doc.uid;
}

var cache = (duration) => {
  return (req, res, next) => {
    let key = '__express__' + req.originalUrl || req.url
    let cachedBody = mcache.get(key)
    if (cachedBody) {
      res.send(cachedBody)
      return
    } else {
      res.sendResponse = res.send
      res.send = (body) => {
        mcache.put(key, body, duration * 1000);
        res.sendResponse(body)
      }
      next()
    }
  }
}

function api() {
  return Prismic.api('https://infinitelimit.prismic.io/api', {
    apiDataTTL: 60
  });
}

app.get('/', cache(cTime), (req, res, next) => {
  // Retrieve the home page, render and serve
//  res.status(200).send('Welcome to infinitelimit.net');
  api().then((api) => {
    return api.query(
      Prismic.Predicates.at('document.type', 'article'),
      { fetchLinks: ['category.title', 'category.uid', 'author.name'], orderings: '[my.article.date desc]' }
    );
  }).then((docs) => {
    res.render('index', { 
      docs: docs 
    });
  });
});

app.get('/tags/:tag', cache(cTime), (req, res, next) => {
  // Retrieve the home page, render and serve
//  res.status(200).send('Welcome to infinitelimit.net');
  api().then((api) => {
    return api.query([
      Prismic.Predicates.at('document.type', 'article'),
      Prismic.Predicates.any('document.tags', [req.params.tag]) 
    ], { 
      fetchLinks: ['category.title', 'author.name'], 
      orderings: '[my.article.date desc]' 
    });
  }).then((docs) => {
    res.render('index', { 
      docs: docs 
    });
  });
});

app.get('/categories/:uid', cache(cTime), (req, res, next) => {
  // Retrieve the home page, render and serve
//  res.status(200).send('Welcome to infinitelimit.net');
  api().then((api) => {
    return api.getByUID('category', req.params.uid)
      .then((category) => {
        if (!category) {
        // It doesn't exist. We need a 404.
          res.status(404).send();
          return;
        }
        return api.query([
          Prismic.Predicates.at('document.type', 'article'),
          Prismic.Predicates.at('my.article.category', category.id) 
        ], { 
          fetchLinks: ['category.title', 'author.name'], 
          orderings: '[my.article.date desc]' 
        });
      });
  }).then((docs) => {
    res.render('index', { 
      docs: docs 
    });
  });
});
app.get('/author/:uid', cache(cTime), (req, res, next) => {
  // Retrieve the home page, render and serve
//  res.status(200).send('Welcome to infinitelimit.net');
  api().then((api) => {
    return api.getByUID('author', req.params.uid)
      .then((author) => {
        if (!author) {
        // It doesn't exist. We need a 404.
          res.status(404).send();
          return;
        }
        return api.query([
          Prismic.Predicates.at('document.type', 'article'),
          Prismic.Predicates.at('my.article.author', author.id) 
        ], { 
          fetchLinks: ['category.title', 'author.name'], 
          orderings: '[my.article.date desc]' 
        });
      });
  }).then((docs) => {
    res.render('index', { 
      docs: docs 
    });
  });
});

app.get('/favicon.ico', (req, res) => {
  res.sendFile('static/favicons/favicon.ico');
});


app.post('/webhook', (req, res) => {
  mcache.clear();
  res.status(200).send();
});

app.get('/article/:uid', cache(cTime), (req, res, next) => {
  api().then((api) => {
    return api.getByUID('article', req.params.uid, { 
      fetchLinks: ['category.title']
    })
    .then((doc) => {
      return api.getByID(doc.getLink('article.author').id).then((author) => {
        if (!doc) {
          res.status(404).send();
          return;
        }
        const category = doc.getLink('article.category');
        const locals = {
          title: doc.getStructuredText('article.title').asText(),
          category: category ? category.getText('category.title') : null,
          publishDate: formatDate(doc.firstPublicationDate),
          categorySlug: category ? category.uid : null,
          description: doc.getStructuredText('article.description').asText(),
          image: doc.getImage('article.thumbnail') ? doc.getImage('article.thumbnail').url : null,
          body: doc.getSliceZone('article.body').slices,
          author: {
            uid: author.uid,
            name: author.getText('author.name'),
            bio: author.getStructuredText('author.bio').asHtml(),
            avatar: author.getImage('author.avatar') ? author.getImage('author.avatar').url : null
          },
          tags: doc.tags
        };
        res.render('article', locals);

      });
    });
  })
  .catch((reason) => {
    next(reason);
  }); 
});

app.get('/:uid', cache(cTime), (req, res, next) => {
  api().then((api) => {
    return api.getByUID('page', req.params.uid)
  })
  .then((doc) => {
    if (!doc) {
      res.status(404).send();
      return;
    }
    const locals = {
      title: doc.getStructuredText('page.title').asText(),
      description: null,
      image: doc.getImage('page.thumbnail') ? doc.getImage('page.thumbnail').url : null,
      body: doc.getSliceZone('page.body').slices,
      tags: []
    };
    res.render('article', locals);
  })
  .catch((reason) => {
    next(reason);
  }); 
});

app.listen(process.env.PORT || 3000, () => {
  console.log('InfiniteLimit server listening...')
});
