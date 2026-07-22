package service

import (
	"errors"
	"strings"
)

// ErrUpstream marks failures that originate from an external rate provider or
// from communicating with it (request build, transport, non-2xx status,
// unparseable/unsuccessful body). Handlers map it to a 502 with a generic,
// non-leaking message.
var ErrUpstream = errors.New("upstream provider error")

// redact removes secret (typically an API key) from an error message so the
// error can be wrapped and logged without leaking credentials. Guards against
// an empty secret, which would otherwise splice the placeholder between every
// character.
func redact(msg, secret string) string {
	if secret == "" {
		return msg
	}
	return strings.ReplaceAll(msg, secret, "[redacted]")
}
