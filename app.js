import http from 'http';
import got from 'got';
import url from 'url';
import path from 'path';
// import HttpsProxyAgent from 'https-proxy-agent';


const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  const query = parsedUrl.query;
  console.log(query);
  let downloadUrl = query.url;
  const time = query.time;
  // const token = query.token;


  // 检查参数是否为空
  if (!downloadUrl || !time) {
    res.statusCode = 401;
    res.end("Missing required parameters.");
    return;
  }

  // 时间戳的简单验证
  const now = new Date().getTime();
  const timeDiff = now - time;
  const threeHour = 1000 * 60 * 60 * 3;
  if (timeDiff < 0 || timeDiff > threeHour) {
    res.statusCode = 401;
    res.end("Token expired, please request a new one.");
    return;
  }



  let fileName = path.basename(parsedUrl.query.url);


  try {

    const preResponse = await got.head(downloadUrl, {
      timeout: { socket: 60000 },
      followRedirect: false,
      // agent: {
      //   http: new HttpsProxyAgent('http://127.0.0.1:7890'),
      //   https: new HttpsProxyAgent('http://127.0.0.1:7890'),
      // }
    });

    if (preResponse.statusCode >= 300 && preResponse.statusCode < 400 && preResponse.headers.location) {
      downloadUrl = preResponse.headers.location;
      fileName = path.basename(downloadUrl);
    }


    const response = got.stream(downloadUrl, {
      timeout: { socket: 60000 },
      // headers: {

      // },
      // agent: {
      //   http: new HttpsProxyAgent('http://127.0.0.1:7890'),
      //   https: new HttpsProxyAgent('http://127.0.0.1:7890'),
      // }
    });
    response.on('response', (response) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
      res.setHeader('Access-Control-Max-Age', 60 * 60 * 24 * 30);
      res.setHeader('Content-Type', response.headers['content-type']);
      res.setHeader('Content-Length', response.headers['content-length']);
      console.log(fileName);
      res.setHeader('Content-Disposition', 'attachment; filename=' + fileName);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    })
    response.on('error', (error) => {
      console.error(error);
      res.statusCode = 404;
      res.end(error.message);
    });
    response.pipe(res);
  } catch (error) {
    if (error.name === "TimeoutError") {
      console.error(error);
      res.statusCode = 504;
      res.end("请求超时");
    } else {
      console.error(error);
      res.statusCode = 404;
      res.end("请求失败");
    }
  }

});

server.listen(3000);
console.log('Server running at http://127.0.0.1:3000');
