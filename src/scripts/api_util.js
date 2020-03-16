// make an ajax request
export const makeRequest = (url, method) => {
  const request = new XMLHttpRequest();
  return new Promise((resolve, reject) => {
    request.onreadystatechange = function() {
      // Only run if the request is complete
      if (request.readyState !== 4) return;
      if (request.status >= 200 && request.status < 300) {
        // Success
        resolve(request);
      } else {
        // Failure
        reject({
          status: request.status,
          statusText: request.statusText
        });
      }
    };
    request.open(method || "GET", url, true);
    request.send();
  });
};
