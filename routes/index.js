var express = require('express');
var router = express.Router();
const dataCatalog = require('../controllers/datacatalog');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// 健康码
router.get('/jk', dataCatalog.getHealth);
// 随申码
router.get('/ssm', dataCatalog.getJkmInfo);
// 核酸检测
router.get('/hsjc', dataCatalog.getHsjc);
// 健康码和核酸检测结果
router.get('/jkhs', dataCatalog.getJkmAndHsjc);
// 疫苗信息
router.get('/yimiao', dataCatalog.getYimiao);


module.exports = router;
