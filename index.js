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
      { orderings: '[my.article.date desc]' }
    );
  }).then((docs) => {
    console.log(docs);
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
    return api.getByUID('article', req.params.uid);
  })
  .then((doc) => {
    const locals = {
      title: doc.getStructuredText('article.title').asText(),
      image: doc.getImage('article.thumbnail').url,
      body: doc.getSliceZone('article.body').slices
    };
    console.log(locals);
    res.render('article', locals);
    // res.send(locals);
  })
  .catch((reason) => {
    next(reason);
  }); 
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Example app listening...')
});
