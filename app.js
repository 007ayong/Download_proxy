import http from 'http';
import got from 'got';
import url from 'url';
import path from 'path';

const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
  res.setHeader('Access-Control-Max-Age', 60 * 60 * 24 * 30);

  let rangeHeader = req.headers['range'];

  // console.log(rangeHeader);
  const parsedUrl = url.parse(req.url, true);
  const query = parsedUrl.query;
  const decodedUrl = query.url;
  const time = query.time;


  // 检查参数是否为空
  if (!decodedUrl || !time) {
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
  console.log(decodedUrl)
  try {
    const preResponse = await got.head(decodedUrl, {
      timeout: { socket: 60000 },
      followRedirect: false,
    });
    if (preResponse.statusCode === 404) {
      res.statusCode = 204;
      res.end("文件未找到");
      return;
    } else if (preResponse.statusCode >= 300 && preResponse.statusCode < 400 && preResponse.headers.location) {
      const redirectUrl = preResponse.headers.location;
      // console.log('Redirect URL:', redirectUrl);

      try {
        const redirectResponse = await got.head(redirectUrl, {
          timeout: { socket: 60000 },
          followRedirect: false,
        });

        if (redirectResponse.statusCode === 200) {
          let fileName = path.basename(redirectUrl);
          const contentDisposition = redirectResponse.headers['content-disposition'];

          if (contentDisposition) {
            const match = /filename="(.*?)"/.exec(contentDisposition);
            if (match && match[1]) {
              fileName = match[1];
            }
          }
          let fileSize = NaN;
          if (redirectResponse.headers['content-length']) {
            fileSize = parseInt(redirectResponse.headers['content-length']);
          }
          if (!isNaN(fileSize) && fileSize > 0) {
            // Set appropriate response headers for content disposition, content type, etc.
            // ...
            if (rangeHeader) {
              res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
              res.setHeader('Content-Length', fileSize);
              const response = got.stream(redirectUrl, {
                timeout: { socket: 60000 },
                headers: {
                  Range: rangeHeader || `bytes=0-${fileSize - 1}`,
                },
              });
              response.on('error', (error) => {
                console.error(error);
                res.statusCode = 404;
                res.end(error.message);
              });
              response.pipe(res);
              return;
            } else {
              res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
              res.setHeader('Content-Length', fileSize);
              const response = got.stream(redirectUrl, {
                timeout: { socket: 60000 },
              });
              response.on('error', (error) => {
                console.error(error);
                res.statusCode = 404;
                res.end(error.message);
              });
              response.pipe(res);
              return;
            }
          }
        }
      } catch (error) {
        console.error(error);
        return;
      }
    } else if (preResponse.statusCode === 200) {
      let fileName = path.basename(decodedUrl);
      const contentDisposition = preResponse.headers['content-disposition'];
      if (contentDisposition) {
        const match = /filename="(.*?)"/.exec(contentDisposition);
        if (match && match[1]) {
          fileName = match[1];
        }
      }
      let fileSize = NaN;
      if (preResponse.headers['content-length']) {
        fileSize = parseInt(preResponse.headers['content-length']);
      }
      if (!isNaN(fileSize) && fileSize > 0) {
        // Check if the filename has an extension like .zip, .exe, etc.
        if (path.extname(fileName)) {
          // Set appropriate response headers for content disposition, content type, etc.
          // ...
          if (rangeHeader) {
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Length', fileSize);

            const response = got.stream(decodedUrl, {
              timeout: { socket: 60000 },
              headers: {
                Range: rangeHeader || `bytes=0-${fileSize - 1}`,
              },
            });
            response.on('error', (error) => {
              console.error(error);
              res.statusCode = 404;
              res.end(error.message);
            });
            response.pipe(res);
            return;
          } else {
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Length', fileSize);
            const response = got.stream(decodedUrl, {
              timeout: { socket: 60000 },
            });
            // res.statusCode = 200;
            response.on('error', (error) => {
              console.error(error);
              res.statusCode = 404;
              res.end(error.message);
            });
            response.pipe(res);
            return;
          }
        }
      }
    }
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
    return;
  }
});

server.listen(3000);
console.log('Server running at http://127.0.0.1:3000');
