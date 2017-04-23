const bodyParser = require('body-parser');
const express = require('express');
const Prismic = require('prismic.io');

const app = express();

app.set('views', 'layouts');
app.set('view engine', 'pug');
app.use(bodyParser.json());
app.use('/static', express.static('static'));

function resolve(doc) {
  if (doc.type !== 'article') {
    return '/' + doc.uid;
  }
  return '/article/' + doc.uid;
}

function api() {
  return Prismic.api('https://infinitelimit.prismic.io/api', {
    apiDataTTL: 60
  });
}

app.get('/', (req, res, next) => {
  // Retrieve the home page, render and serve
//  res.status(200).send('Welcome to infinitelimit.net');
  api().then((api) => {
    return api.query(
      Prismic.Predicates.at('document.type', 'article'),
      { fetchLinks: ['category.title', 'category.uid'], orderings: '[my.article.date desc]' }
    );
  }).then((docs) => {
    //console.log(docs);
    res.render('index', { 
      docs: docs 
    });
  });
});

app.get('/tags/:tag', (req, res, next) => {
  // Retrieve the home page, render and serve
//  res.status(200).send('Welcome to infinitelimit.net');
  api().then((api) => {
    return api.query([
      Prismic.Predicates.at('document.type', 'article'),
      Prismic.Predicates.any('document.tags', [req.params.tag]) 
    ], { 
      fetchLinks: 'category.title', 
      orderings: '[my.article.date desc]' 
    });
  }).then((docs) => {
    //console.log(docs);
    res.render('index', { 
      docs: docs 
    });
  });
});

app.get('/categories/:uid', (req, res, next) => {
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
          fetchLinks: 'category.title', 
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
  res.status(204).send();
});


app.post('/webhook', (req, res) => {
  console.log(req.body);
  res.status(200).send();
});

app.get('/article/:uid', (req, res, next) => {
  api().then((api) => {
    return api.getByUID('article', req.params.uid, { 
      fetchLinks: 'category.title'
    })
  })
  .then((doc) => {
    //console.log(doc);
    if (!doc) {
      res.status(404).send();
      return;
    }
    const category = doc.getLink('article.category');
    console.log(category);
    const author = doc.getLink('article.author');
    const locals = {
      title: doc.getStructuredText('article.title').asText(),
      category: category ? category.getText('category.title') : null,
      categorySlug: category ? category.uid : null,
      description: doc.getStructuredText('article.description').asText(),
      image: doc.getImage('article.thumbnail') ? doc.getImage('article.thumbnail').url : null,
      body: doc.getSliceZone('article.body').slices,
      tags: doc.tags
    };
    //console.log(locals);
    res.render('article', locals);
  })
  .catch((reason) => {
    next(reason);
  }); 
});

app.get('/:uid', (req, res, next) => {
  api().then((api) => {
    return api.getByUID('page', req.params.uid)
  })
  .then((doc) => {
    if (!doc) {
      res.status(404).send();
      return;
    }
    //console.log(doc);
    const locals = {
      title: doc.getStructuredText('page.title').asText(),
      description: null,
      image: doc.getImage('page.thumbnail') ? doc.getImage('page.thumbnail').url : null,
      body: doc.getSliceZone('page.body').slices,
      tags: []
    };
    //console.log(locals);
    res.render('article', locals);
  })
  .catch((reason) => {
    next(reason);
  }); 
});

app.listen(process.env.PORT || 3000, () => {
  console.log('InfiniteLimit server listening...')
});
