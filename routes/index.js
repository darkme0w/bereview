const uri = (name) => '/api/v1/' + name;

module.exports = function (app) {
    app.use(uri('auth'), require('./auth.route'))
    app.use(uri('categories'), require('./category.route'))
    app.use(uri('products'), require('./products.route'))
    app.use(uri('upload'), require('./upload.route'))
    app.use(uri('order'), require('./order.route'))
    app.use(uri('config'), require('./config.route'))
    app.use(uri('banner'), require('./banner.route'))
    app.use(uri('blogs'), require('./blog.route'))
    app.use(uri('reviews'), require('./review.route'))
}