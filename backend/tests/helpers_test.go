package tests

import (
	"bytes"
	"net/http"
	"net/http/httptest"
)

// performRequest simulates an HTTP request against the initialized testRouter
func performRequest(method, path string, body []byte, cookie *http.Cookie) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	if cookie != nil {
		req.AddCookie(cookie)
	}
	w := httptest.NewRecorder()
	testRouter.ServeHTTP(w, req)
	return w
}
