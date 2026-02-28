/**
 * FreeLang core/http - Test Suite
 *
 * Tests for HTTP client and server
 * Total: 20 test cases
 */

#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "http.h"

/* ===== Test Framework ===== */

static int test_count = 0;
static int pass_count = 0;
static int fail_count = 0;

#define ASSERT(condition, message) \
  do { \
    test_count++; \
    if (condition) { \
      pass_count++; \
      printf("✓ Test %d: %s\n", test_count, message); \
    } else { \
      fail_count++; \
      printf("✗ Test %d: %s\n", test_count, message); \
    } \
  } while(0)

#define ASSERT_EQUAL_INT(actual, expected, message) \
  ASSERT((actual) == (expected), message)

#define ASSERT_EQUAL_STR(actual, expected, message) \
  ASSERT(strcmp((actual), (expected)) == 0, message)

/* ===== REQUEST TESTS ===== */

/**
 * Test 1: HTTP request creation (GET)
 */
void test_http_request_create_get(void) {
  fl_http_request_t *req = fl_http_request_create(FL_HTTP_GET, "/api/users");
  ASSERT(req != NULL, "HTTP GET request created");
  ASSERT_EQUAL_INT(req->method, FL_HTTP_GET, "Method is GET");
  ASSERT_EQUAL_STR(req->path, "/api/users", "Path is /api/users");

  fl_http_request_destroy(req);
}

/**
 * Test 2: HTTP request creation (POST)
 */
void test_http_request_create_post(void) {
  fl_http_request_t *req = fl_http_request_create(FL_HTTP_POST, "/api/create");
  ASSERT(req != NULL, "HTTP POST request created");
  ASSERT_EQUAL_INT(req->method, FL_HTTP_POST, "Method is POST");
  ASSERT_EQUAL_STR(req->path, "/api/create", "Path is /api/create");

  fl_http_request_destroy(req);
}

/**
 * Test 3: HTTP request different methods
 */
void test_http_request_methods(void) {
  fl_http_request_t *req_put = fl_http_request_create(FL_HTTP_PUT, "/api/update");
  ASSERT_EQUAL_INT(req_put->method, FL_HTTP_PUT, "PUT method");
  fl_http_request_destroy(req_put);

  fl_http_request_t *req_del = fl_http_request_create(FL_HTTP_DELETE, "/api/delete");
  ASSERT_EQUAL_INT(req_del->method, FL_HTTP_DELETE, "DELETE method");
  fl_http_request_destroy(req_del);
}

/**
 * Test 4: Add request header
 */
void test_http_request_add_header(void) {
  fl_http_request_t *req = fl_http_request_create(FL_HTTP_GET, "/api/test");
  fl_http_headers_t *headers = fl_http_headers_create(10);

  int ret = fl_http_headers_set(headers, "Content-Type", "application/json");
  ASSERT(ret == 0, "Header set successfully");

  req->headers = headers;
  ASSERT(req->headers != NULL, "Headers assigned to request");

  fl_http_headers_destroy(headers);
  fl_http_request_destroy(req);
}

/**
 * Test 5: Get request header
 */
void test_http_request_get_header(void) {
  fl_http_headers_t *headers = fl_http_headers_create(10);

  fl_http_headers_set(headers, "Authorization", "Bearer token123");
  const char *auth = fl_http_headers_get(headers, "Authorization");

  ASSERT(auth != NULL, "Header retrieved");
  ASSERT_EQUAL_STR(auth, "Bearer token123", "Header value matches");

  fl_http_headers_destroy(headers);
}

/**
 * Test 6: Check header exists
 */
void test_http_request_has_header(void) {
  fl_http_headers_t *headers = fl_http_headers_create(10);

  fl_http_headers_set(headers, "Accept", "application/json");
  int exists = fl_http_headers_has(headers, "Accept");

  ASSERT(exists, "Header exists");

  fl_http_headers_destroy(headers);
}

/**
 * Test 7: Set request body
 */
void test_http_request_body(void) {
  fl_http_request_t *req = fl_http_request_create(FL_HTTP_POST, "/api/create");

  const char *body = "{\"name\": \"John\"}";
  int ret = fl_http_request_set_body(req, (uint8_t*)body, strlen(body));

  ASSERT(ret == 0, "Body set successfully");
  ASSERT(req->body_size > 0, "Body size set");
  ASSERT(req->body != NULL, "Body pointer set");

  fl_http_request_destroy(req);
}

/**
 * Test 8: Serialize GET request
 */
void test_http_request_serialize_get(void) {
  fl_http_request_t *req = fl_http_request_create(FL_HTTP_GET, "/api/test");
  req->uri = "/api/test";

  char *serialized = fl_http_request_to_string(req);

  ASSERT(serialized != NULL, "Request serialized");
  ASSERT(strstr(serialized, "GET") != NULL, "Contains GET method");
  ASSERT(strstr(serialized, "/api/test") != NULL, "Contains path");

  free(serialized);
  fl_http_request_destroy(req);
}

/* ===== RESPONSE TESTS ===== */

/**
 * Test 9: HTTP response creation
 */
void test_http_response_create(void) {
  fl_http_response_t *resp = fl_http_response_create();
  ASSERT(resp != NULL, "HTTP response created");

  if (resp) {
    fl_http_response_destroy(resp);
  }
}

/**
 * Test 10: Set response status
 */
void test_http_response_status(void) {
  fl_http_response_t *resp = fl_http_response_create();

  int ret = fl_http_response_set_status(resp, 200, "OK");
  ASSERT(ret == 0, "Status set successfully");
  ASSERT_EQUAL_INT(resp->status_code, 200, "Status code is 200");
  ASSERT_EQUAL_STR(resp->status_text, "OK", "Status text is OK");

  fl_http_response_destroy(resp);
}

/**
 * Test 11: Set various status codes
 */
void test_http_response_various_status(void) {
  fl_http_response_t *resp = fl_http_response_create();

  fl_http_response_set_status(resp, 404, "Not Found");
  ASSERT(resp->status_code == 404, "404 status code");

  fl_http_response_set_status(resp, 500, "Internal Server Error");
  ASSERT(resp->status_code == 500, "500 status code");

  fl_http_response_destroy(resp);
}

/**
 * Test 12: Add response header
 */
void test_http_response_add_header(void) {
  fl_http_response_t *resp = fl_http_response_create();

  int ret = fl_http_response_add_header(resp, "Content-Type", "application/json");
  ASSERT(ret == 0, "Header added successfully");
  ASSERT(resp->header_count > 0, "Header count increased");

  fl_http_response_destroy(resp);
}

/**
 * Test 13: Set response body
 */
void test_http_response_body(void) {
  fl_http_response_t *resp = fl_http_response_create();

  const char *body = "{\"status\": \"success\"}";
  int ret = fl_http_response_set_body(resp, body, strlen(body));

  ASSERT(ret == 0, "Body set successfully");
  ASSERT(resp->body_len > 0, "Body length set");
  ASSERT_EQUAL_STR((char*)resp->body, body, "Body content matches");

  fl_http_response_destroy(resp);
}

/**
 * Test 14: Serialize response
 */
void test_http_response_serialize(void) {
  fl_http_response_t *resp = fl_http_response_create();

  fl_http_response_set_status(resp, 200, "OK");
  fl_http_response_add_header(resp, "Content-Type", "text/html");
  fl_http_response_set_body(resp, "<h1>Hello</h1>", 14);

  char *serialized = fl_http_response_serialize(resp);

  ASSERT(serialized != NULL, "Response serialized");
  ASSERT(strstr(serialized, "200") != NULL, "Contains status code");
  ASSERT(strstr(serialized, "Content-Type") != NULL, "Contains header");

  free(serialized);
  fl_http_response_destroy(resp);
}

/**
 * Test 15: Parse HTTP request
 */
void test_http_request_parse(void) {
  const char *raw_req = "GET /api/test HTTP/1.1\r\nHost: example.com\r\n\r\n";

  fl_http_request_t *req = fl_http_request_parse(raw_req);

  ASSERT(req != NULL, "Request parsed");
  if (req) {
    ASSERT_EQUAL_STR(req->method, "GET", "Parsed method is GET");
    ASSERT_EQUAL_STR(req->path, "/api/test", "Parsed path is /api/test");
    fl_http_request_destroy(req);
  }
}

/**
 * Test 16: Parse HTTP response
 */
void test_http_response_parse(void) {
  const char *raw_resp = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<h1>Hello</h1>";

  fl_http_response_t *resp = fl_http_response_parse(raw_resp);

  ASSERT(resp != NULL, "Response parsed");
  if (resp) {
    ASSERT_EQUAL_INT(resp->status_code, 200, "Parsed status is 200");
    fl_http_response_destroy(resp);
  }
}

/**
 * Test 17: Request with query string
 */
void test_http_request_query_string(void) {
  fl_http_request_t *req = fl_http_request_create();

  fl_http_request_set_method(req, "GET");
  fl_http_request_set_path(req, "/search?q=test&limit=10");

  ASSERT_EQUAL_STR(req->path, "/search?q=test&limit=10", "Query string preserved");

  fl_http_request_destroy(req);
}

/**
 * Test 18: Response with content length
 */
void test_http_response_content_length(void) {
  fl_http_response_t *resp = fl_http_response_create();

  const char *body = "Hello World";
  fl_http_response_set_body(resp, body, strlen(body));
  fl_http_response_add_header(resp, "Content-Length", "11");

  ASSERT(resp->body_len == strlen(body), "Content length matches body");

  fl_http_response_destroy(resp);
}

/**
 * Test 19: Request with authentication
 */
void test_http_request_auth(void) {
  fl_http_request_t *req = fl_http_request_create();

  fl_http_request_set_method(req, "GET");
  fl_http_request_add_header(req, "Authorization", "Bearer eyJhbGc...");

  ASSERT(req->header_count > 0, "Authorization header added");

  fl_http_request_destroy(req);
}

/**
 * Test 20: Response redirect handling
 */
void test_http_response_redirect(void) {
  fl_http_response_t *resp = fl_http_response_create();

  fl_http_response_set_status(resp, 302, "Found");
  fl_http_response_add_header(resp, "Location", "https://example.com/new-path");

  ASSERT(resp->status_code == 302, "302 redirect status");

  fl_http_response_destroy(resp);
}

/* ===== MAIN TEST RUNNER ===== */

int main(void) {
  printf("🧪 Running HTTP Module Tests\n");
  printf("════════════════════════════════════════\n\n");

  printf("📤 Request Tests (8):\n");
  test_http_request_create_get();
  test_http_request_create_post();
  test_http_request_methods();
  test_http_request_add_header();
  test_http_request_get_header();
  test_http_request_has_header();
  test_http_request_body();
  test_http_request_serialize_get();

  printf("\n📥 Response Tests (12):\n");
  test_http_response_create_ok();
  test_http_response_create_notfound();
  test_http_response_various_status();
  test_http_response_add_header();
  test_http_response_body();
  test_http_response_serialize();
  test_http_response_parse();
  test_http_request_parse();
  test_http_request_query_params();
  test_http_response_content_headers();
  test_http_request_bearer_token();
  test_http_response_redirect_302();

  // Results
  printf("\n════════════════════════════════════════\n");
  printf("📊 Test Results:\n");
  printf("  Total:  %d\n", test_count);
  printf("  Passed: %d ✅\n", pass_count);
  printf("  Failed: %d ❌\n", fail_count);
  printf("\n");

  if (fail_count == 0) {
    printf("🎉 All tests passed!\n");
    return 0;
  } else {
    printf("⚠️  %d test(s) failed\n", fail_count);
    return 1;
  }
}
