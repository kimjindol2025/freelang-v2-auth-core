/**
 * FreeLang WebSocket Module (Phase 16 Week 4)
 * WebSocket server and client using core/websocket.c
 * Uses Promise Bridge for async/await support
 */

#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <uv.h>
#include <pthread.h>
#include "../ffi/freelang_ffi.h"

/* ===== Constants ===== */

#define MAX_SERVERS 256
#define MAX_SOCKETS 4096

/* ===== WebSocket State ===== */

typedef enum {
  WS_STATE_CONNECTING = 0,
  WS_STATE_OPEN = 1,
  WS_STATE_CLOSING = 2,
  WS_STATE_CLOSED = 3
} ws_state_t;

/* ===== Internal Structures ===== */

typedef struct {
  int id;
  int port;
  uv_tcp_t tcp;
  int on_connection_cb;
  int state;
  int destroyed;
  fl_event_context_t *ctx;
} fl_ws_server_t;

typedef struct {
  int id;
  int fd;  /* File descriptor for websocket.c */
  int state;
  int on_msg_cb;
  int on_close_cb;
  int on_error_cb;
  int on_open_cb;
  char *url;
  int destroyed;
  fl_event_context_t *ctx;
} fl_ws_socket_t;

/* ===== Global State ===== */

static fl_ws_server_t *server_table[MAX_SERVERS] = {NULL};
static int next_server_id = 1;

static fl_ws_socket_t *socket_table[MAX_SOCKETS] = {NULL};
static int next_socket_id = 1;

/* ===== Helper Functions ===== */

static int server_alloc_id(fl_ws_server_t *server) {
  if (next_server_id >= MAX_SERVERS) {
    return -1;
  }
  int id = next_server_id++;
  server_table[id] = server;
  return id;
}

static fl_ws_server_t* server_get(int id) {
  if (id <= 0 || id >= MAX_SERVERS) {
    return NULL;
  }
  return server_table[id];
}

static void server_free_id(int id) {
  if (id > 0 && id < MAX_SERVERS) {
    server_table[id] = NULL;
  }
}

static int socket_alloc_id(fl_ws_socket_t *socket) {
  if (next_socket_id >= MAX_SOCKETS) {
    return -1;
  }
  int id = next_socket_id++;
  socket_table[id] = socket;
  return id;
}

static fl_ws_socket_t* socket_get(int id) {
  if (id <= 0 || id >= MAX_SOCKETS) {
    return NULL;
  }
  return socket_table[id];
}

static void socket_free_id(int id) {
  if (id > 0 && id < MAX_SOCKETS) {
    socket_table[id] = NULL;
  }
}

/* ===== WebSocket Server ===== */

int fl_ws_server_create(int port, int callback_id) {
  fl_ws_server_t *server = (fl_ws_server_t *)malloc(sizeof(fl_ws_server_t));
  if (!server) return -1;

  memset(server, 0, sizeof(fl_ws_server_t));
  server->port = port;
  server->on_connection_cb = callback_id;
  server->state = WS_STATE_CLOSED;
  server->destroyed = 0;

  int id = server_alloc_id(server);
  if (id < 0) {
    free(server);
    return -1;
  }

  server->id = id;
  fprintf(stderr, "[ws] Server created: id=%d, port=%d\n", id, port);

  return id;
}

int fl_ws_server_listen(int server_id, int callback_id) {
  fl_ws_server_t *server = server_get(server_id);
  if (!server || server->destroyed) return -1;

  server->state = WS_STATE_OPEN;
  fprintf(stderr, "[ws] Server listening: id=%d, port=%d\n",
          server_id, server->port);

  /* TODO: Bind to port with uv_tcp_t */
  /* TODO: Call callback when connection arrives */

  return 0;
}

int fl_ws_server_close(int server_id, int callback_id) {
  fl_ws_server_t *server = server_get(server_id);
  if (!server) return -1;

  if (!server->destroyed) {
    server->destroyed = 1;
    server->state = WS_STATE_CLOSED;
    free(server);
    server_free_id(server_id);
    fprintf(stderr, "[ws] Server closed: id=%d\n", server_id);
  }

  return 0;
}

/* ===== WebSocket Socket (Server-side) ===== */

int fl_ws_send(int socket_id, const char *message, int callback_id) {
  fl_ws_socket_t *socket = socket_get(socket_id);
  if (!socket || socket->destroyed) return -1;

  fprintf(stderr, "[ws] Send: socket=%d, len=%zu\n", socket_id, strlen(message));

  /* TODO: Use websocket.c's fl_ws_send_text() */
  /* TODO: Call callback when sent */

  return 0;
}

int fl_ws_close(int socket_id) {
  fl_ws_socket_t *socket = socket_get(socket_id);
  if (!socket || socket->destroyed) return -1;

  socket->state = WS_STATE_CLOSING;
  fprintf(stderr, "[ws] Close: socket=%d\n", socket_id);

  /* TODO: Send close frame */
  /* TODO: Call on_close callback */

  return 0;
}

int fl_ws_on_message(int socket_id, int callback_id) {
  fl_ws_socket_t *socket = socket_get(socket_id);
  if (!socket) return -1;

  socket->on_msg_cb = callback_id;
  fprintf(stderr, "[ws] Message callback registered: id=%d\n", callback_id);

  return 0;
}

int fl_ws_on_close(int socket_id, int callback_id) {
  fl_ws_socket_t *socket = socket_get(socket_id);
  if (!socket) return -1;

  socket->on_close_cb = callback_id;
  return 0;
}

int fl_ws_on_error(int socket_id, int callback_id) {
  fl_ws_socket_t *socket = socket_get(socket_id);
  if (!socket) return -1;

  socket->on_error_cb = callback_id;
  return 0;
}

/* ===== WebSocket Client ===== */

int fl_ws_client_connect(const char *url, int callback_id) {
  fl_ws_socket_t *socket = (fl_ws_socket_t *)malloc(sizeof(fl_ws_socket_t));
  if (!socket) return -1;

  memset(socket, 0, sizeof(fl_ws_socket_t));
  socket->url = (char *)malloc(strlen(url) + 1);
  if (!socket->url) {
    free(socket);
    return -1;
  }
  strcpy(socket->url, url);

  socket->state = WS_STATE_CONNECTING;
  socket->on_open_cb = callback_id;
  socket->destroyed = 0;

  int id = socket_alloc_id(socket);
  if (id < 0) {
    free(socket->url);
    free(socket);
    return -1;
  }

  socket->id = id;
  fprintf(stderr, "[ws] Client connecting: id=%d, url=%s\n", id, url);

  /* TODO: Parse URL and connect with uv_tcp_t */
  /* TODO: Send WebSocket handshake request */
  /* TODO: Call on_open callback when connected */

  return id;
}

int fl_ws_client_send(int socket_id, const char *message, int callback_id) {
  fl_ws_socket_t *socket = socket_get(socket_id);
  if (!socket || socket->destroyed || socket->state != WS_STATE_OPEN) return -1;

  fprintf(stderr, "[ws] Client send: socket=%d, len=%zu\n", socket_id, strlen(message));

  /* TODO: Send masked frame */
  /* TODO: Call callback when sent */

  return 0;
}

int fl_ws_client_close(int socket_id, int callback_id) {
  fl_ws_socket_t *socket = socket_get(socket_id);
  if (!socket || socket->destroyed) return -1;

  socket->state = WS_STATE_CLOSING;
  fprintf(stderr, "[ws] Client close: socket=%d\n", socket_id);

  /* TODO: Send close frame */
  /* TODO: Call callback */

  return 0;
}

int fl_ws_client_on_message(int socket_id, int callback_id) {
  fl_ws_socket_t *socket = socket_get(socket_id);
  if (!socket) return -1;

  socket->on_msg_cb = callback_id;
  return 0;
}

int fl_ws_client_on_close(int socket_id, int callback_id) {
  fl_ws_socket_t *socket = socket_get(socket_id);
  if (!socket) return -1;

  socket->on_close_cb = callback_id;
  return 0;
}

int fl_ws_client_on_error(int socket_id, int callback_id) {
  fl_ws_socket_t *socket = socket_get(socket_id);
  if (!socket) return -1;

  socket->on_error_cb = callback_id;
  return 0;
}

int fl_ws_client_on_open(int socket_id, int callback_id) {
  fl_ws_socket_t *socket = socket_get(socket_id);
  if (!socket) return -1;

  socket->on_open_cb = callback_id;
  socket->state = WS_STATE_OPEN;
  return 0;
}

/* ===== Info ===== */

void fl_ws_info(void) {
  fprintf(stderr, "[ws] WebSocket module initialized\n");
  fprintf(stderr, "[ws] Max servers: %d, Max sockets: %d\n",
          MAX_SERVERS, MAX_SOCKETS);
}
