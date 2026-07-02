'use strict';

// Minimal mock of the Temporal proposal for testing serialization protocols.
// It models only the surface that React Flight interacts with: the
// Symbol.toStringTag brand used for detection, toJSON()/toString() used for
// serialization, and the static from() method used to revive values. Real
// implementations parse and canonicalize the string form; this mock just
// echoes it back, so tests should use already-canonical ISO strings.
module.exports = function createTemporalMock() {
  const Temporal = {};
  [
    'Instant',
    'ZonedDateTime',
    'PlainDateTime',
    'PlainDate',
    'PlainTime',
    'PlainYearMonth',
    'PlainMonthDay',
    'Duration',
  ].forEach(name => {
    class TemporalType {
      constructor(isoString) {
        this._isoString = isoString;
      }
      static from(value) {
        return new TemporalType(String(value));
      }
      toString() {
        return this._isoString;
      }
      toJSON() {
        return this._isoString;
      }
    }
    Object.defineProperty(TemporalType.prototype, Symbol.toStringTag, {
      value: 'Temporal.' + name,
      writable: false,
      enumerable: false,
      configurable: true,
    });
    Temporal[name] = TemporalType;
  });
  return Temporal;
};
