/**
 * FreeLang Stream Module (Phase 16 Week 4)
 * Streaming APIs with libuv integration
 * Readable, Writable, and Transform streams
 */

#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <uv.h>
#include "../ffi/freelang_ffi.h"

/* ===== Constants ===== */

#define MAX_STREAMS 1024
#define MAX_BUFFER_SIZE (16 * 1024 * 1024)  /* 16MB */

/* ===== Stream Types ===== */

typedef enum {
  STREAM_TYPE_READABLE,
  STREAM_TYPE_WRITABLE,
  STREAM_TYPE_TRANSFORM
} stream_type_t;

/* ===== Internal Structures ===== */

typedef struct {
  int id;
  stream_type_t type;
  uv_pipe_t pipe;
  int high_water_mark;
  int paused;
  int ended;
  int destroyed;

  /* Callbacks */
  int on_data_cb;
  int on_end_cb;
  int on_error_cb;
  int on_close_cb;
  int on_drain_cb;
  int on_finish_cb;

  /* Data buffer (in-memory linked list) */
  uint8_t *buffer;
  size_t buffer_size;
  size_t buffer_pos;
  size_t buffer_write_pos;

  /* For Transform streams */
  int transform_fn_cb;

  fl_event_context_t *ctx;
} fl_stream_t;

/* ===== Global State ===== */

static fl_stream_t *stream_table[MAX_STREAMS] = {NULL};
static int next_stream_id = 1;

/* ===== Helper Functions ===== */

static int stream_alloc_id(fl_stream_t *stream) {
  if (next_stream_id >= MAX_STREAMS) {
    return -1;
  }
  int id = next_stream_id++;
  stream_table[id] = stream;
  return id;
}

static fl_stream_t* stream_get(int id) {
  if (id <= 0 || id >= MAX_STREAMS) {
    return NULL;
  }
  return stream_table[id];
}

static void stream_free_id(int id) {
  if (id > 0 && id < MAX_STREAMS) {
    stream_table[id] = NULL;
  }
}

/* ===== Readable Stream ===== */

int fl_stream_readable_create(int high_water_mark) {
  fl_stream_t *stream = (fl_stream_t *)malloc(sizeof(fl_stream_t));
  if (!stream) return -1;

  memset(stream, 0, sizeof(fl_stream_t));
  stream->type = STREAM_TYPE_READABLE;
  stream->high_water_mark = (high_water_mark <= 0) ? 16384 : high_water_mark;
  stream->paused = 0;
  stream->ended = 0;
  stream->destroyed = 0;

  stream->buffer = (uint8_t *)malloc(stream->high_water_mark);
  if (!stream->buffer) {
    free(stream);
    return -1;
  }

  memset(stream->buffer, 0, stream->high_water_mark);
  stream->buffer_size = stream->high_water_mark;
  stream->buffer_pos = 0;
  stream->buffer_write_pos = 0;

  int id = stream_alloc_id(stream);
  if (id < 0) {
    free(stream->buffer);
    free(stream);
    return -1;
  }

  stream->id = id;
  fprintf(stderr, "[stream] Readable stream created: id=%d, high_water=%d\n",
          id, stream->high_water_mark);

  return id;
}

int fl_stream_readable_read(int stream_id, int size, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream || stream->destroyed) return -1;

  /* Allocate chunk to return */
  size_t available = stream->buffer_write_pos - stream->buffer_pos;
  if (available == 0) {
    return 0;  /* No data available */
  }

  size_t read_size = (size <= 0) ? available :
                     (size > (int)available) ? available : size;

  /* TODO: Call callback with chunk */
  fprintf(stderr, "[stream] Read: size=%zu\n", read_size);

  stream->buffer_pos += read_size;
  return (int)read_size;
}

int fl_stream_readable_resume(int stream_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream || stream->destroyed) return -1;

  stream->paused = 0;
  fprintf(stderr, "[stream] Readable resumed\n");
  return 0;
}

int fl_stream_readable_pause(int stream_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream || stream->destroyed) return -1;

  stream->paused = 1;
  fprintf(stderr, "[stream] Readable paused\n");
  return 0;
}

int fl_stream_readable_pipe(int readable_id, int writable_id, int callback_id) {
  fl_stream_t *readable = stream_get(readable_id);
  fl_stream_t *writable = stream_get(writable_id);

  if (!readable || !writable || readable->destroyed || writable->destroyed) {
    return -1;
  }

  fprintf(stderr, "[stream] Pipe: readable=%d -> writable=%d\n",
          readable_id, writable_id);

  /* TODO: Copy readable buffer to writable buffer */
  return 0;
}

int fl_stream_readable_on_data(int stream_id, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream) return -1;

  stream->on_data_cb = callback_id;
  fprintf(stderr, "[stream] Data callback registered: id=%d\n", callback_id);
  return 0;
}

int fl_stream_readable_on_end(int stream_id, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream) return -1;

  stream->on_end_cb = callback_id;
  return 0;
}

int fl_stream_readable_on_error(int stream_id, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream) return -1;

  stream->on_error_cb = callback_id;
  return 0;
}

int fl_stream_readable_on_close(int stream_id, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream) return -1;

  stream->on_close_cb = callback_id;
  return 0;
}

int fl_stream_readable_destroy(int stream_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream) return -1;

  if (!stream->destroyed) {
    stream->destroyed = 1;
    if (stream->buffer) {
      free(stream->buffer);
    }
    free(stream);
    stream_free_id(stream_id);
    fprintf(stderr, "[stream] Readable destroyed: id=%d\n", stream_id);
  }

  return 0;
}

/* ===== Writable Stream ===== */

int fl_stream_writable_create(int high_water_mark) {
  fl_stream_t *stream = (fl_stream_t *)malloc(sizeof(fl_stream_t));
  if (!stream) return -1;

  memset(stream, 0, sizeof(fl_stream_t));
  stream->type = STREAM_TYPE_WRITABLE;
  stream->high_water_mark = (high_water_mark <= 0) ? 16384 : high_water_mark;
  stream->paused = 0;
  stream->ended = 0;
  stream->destroyed = 0;

  stream->buffer = (uint8_t *)malloc(stream->high_water_mark);
  if (!stream->buffer) {
    free(stream);
    return -1;
  }

  memset(stream->buffer, 0, stream->high_water_mark);
  stream->buffer_size = stream->high_water_mark;
  stream->buffer_pos = 0;
  stream->buffer_write_pos = 0;

  int id = stream_alloc_id(stream);
  if (id < 0) {
    free(stream->buffer);
    free(stream);
    return -1;
  }

  stream->id = id;
  fprintf(stderr, "[stream] Writable stream created: id=%d\n", id);

  return id;
}

int fl_stream_writable_write(int stream_id, const char *chunk,
                              const char *encoding, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream || stream->destroyed || stream->ended) {
    return -1;
  }

  size_t chunk_len = strlen(chunk);
  size_t available = stream->buffer_size - stream->buffer_write_pos;

  /* Check if buffer would overflow */
  if (chunk_len > available) {
    fprintf(stderr, "[stream] Buffer full: need=%zu, avail=%zu\n",
            chunk_len, available);
    return 1;  /* Indicate drain needed */
  }

  /* Write to buffer */
  memcpy(stream->buffer + stream->buffer_write_pos, chunk, chunk_len);
  stream->buffer_write_pos += chunk_len;

  fprintf(stderr, "[stream] Written: %zu bytes\n", chunk_len);
  return 0;  /* No drain needed */
}

int fl_stream_writable_end(int stream_id, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream || stream->destroyed) return -1;

  stream->ended = 1;
  fprintf(stderr, "[stream] Writable ended\n");

  /* TODO: Call finish callback */
  return 0;
}

int fl_stream_writable_on_drain(int stream_id, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream) return -1;

  stream->on_drain_cb = callback_id;
  return 0;
}

int fl_stream_writable_on_finish(int stream_id, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream) return -1;

  stream->on_finish_cb = callback_id;
  return 0;
}

int fl_stream_writable_on_error(int stream_id, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream) return -1;

  stream->on_error_cb = callback_id;
  return 0;
}

int fl_stream_writable_on_close(int stream_id, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream) return -1;

  stream->on_close_cb = callback_id;
  return 0;
}

int fl_stream_writable_destroy(int stream_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream) return -1;

  if (!stream->destroyed) {
    stream->destroyed = 1;
    if (stream->buffer) {
      free(stream->buffer);
    }
    free(stream);
    stream_free_id(stream_id);
    fprintf(stderr, "[stream] Writable destroyed: id=%d\n", stream_id);
  }

  return 0;
}

/* ===== Transform Stream ===== */

int fl_stream_transform_create(int high_water_mark, int transform_fn_cb) {
  fl_stream_t *stream = (fl_stream_t *)malloc(sizeof(fl_stream_t));
  if (!stream) return -1;

  memset(stream, 0, sizeof(fl_stream_t));
  stream->type = STREAM_TYPE_TRANSFORM;
  stream->high_water_mark = (high_water_mark <= 0) ? 16384 : high_water_mark;
  stream->transform_fn_cb = transform_fn_cb;
  stream->destroyed = 0;

  stream->buffer = (uint8_t *)malloc(stream->high_water_mark);
  if (!stream->buffer) {
    free(stream);
    return -1;
  }

  memset(stream->buffer, 0, stream->high_water_mark);
  stream->buffer_size = stream->high_water_mark;
  stream->buffer_pos = 0;
  stream->buffer_write_pos = 0;

  int id = stream_alloc_id(stream);
  if (id < 0) {
    free(stream->buffer);
    free(stream);
    return -1;
  }

  stream->id = id;
  fprintf(stderr, "[stream] Transform stream created: id=%d\n", id);

  return id;
}

int fl_stream_transform_write(int stream_id, const char *chunk, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream || stream->destroyed || stream->ended) {
    return -1;
  }

  /* TODO: Call transform_fn_cb with chunk */
  size_t chunk_len = strlen(chunk);
  fprintf(stderr, "[stream] Transform write: %zu bytes\n", chunk_len);

  return 0;
}

int fl_stream_transform_end(int stream_id, int callback_id) {
  fl_stream_t *stream = stream_get(stream_id);
  if (!stream || stream->destroyed) return -1;

  stream->ended = 1;
  fprintf(stderr, "[stream] Transform ended\n");

  /* TODO: Call finish callback */
  return 0;
}

/* ===== Info ===== */

void fl_stream_info(void) {
  fprintf(stderr, "[stream] Stream module initialized\n");
  fprintf(stderr, "[stream] Max streams: %d\n", MAX_STREAMS);
}
