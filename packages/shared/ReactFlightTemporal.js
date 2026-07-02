/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Temporal objects are serialized in Flight as '$t' followed by a single
// character identifying the Temporal type, followed by the ISO 8601 /
// RFC 9557 serialization of the value (the result of its toJSON method).
// Every Temporal type round-trips losslessly through this string form via
// its static from() method.

// We detect Temporal objects by their Symbol.toStringTag brand instead of
// instanceof so that we support both native implementations and polyfills,
// including polyfills that are imported as a module without being installed
// on the global scope. The receiving side constructs real instances from the
// global Temporal, which can be native or a globally installed polyfill.

export function getTemporalTag(object: Object): null | string {
  if (object === null || object === undefined) {
    return null;
  }
  const brand = object[Symbol.toStringTag];
  if (typeof brand !== 'string') {
    return null;
  }
  switch (brand) {
    case 'Temporal.Instant':
      return 'I';
    case 'Temporal.ZonedDateTime':
      return 'Z';
    case 'Temporal.PlainDateTime':
      return 'T';
    case 'Temporal.PlainDate':
      return 'D';
    case 'Temporal.PlainTime':
      return 't';
    case 'Temporal.PlainYearMonth':
      return 'Y';
    case 'Temporal.PlainMonthDay':
      return 'M';
    case 'Temporal.Duration':
      return 'P';
    default:
      return null;
  }
}

export function createTemporalFromTag(tag: string, data: string): mixed {
  // Read the global lazily since a polyfill may be installed after this
  // module is first evaluated.
  const Temporal = (globalThis as any).Temporal;
  if (typeof Temporal === 'undefined') {
    throw new Error(
      'Could not deserialize a Temporal object because no global Temporal ' +
        'implementation was available. Load a Temporal polyfill that installs ' +
        'itself on the global scope before deserializing.',
    );
  }
  switch (tag) {
    case 'I':
      return Temporal.Instant.from(data);
    case 'Z':
      return Temporal.ZonedDateTime.from(data);
    case 'T':
      return Temporal.PlainDateTime.from(data);
    case 'D':
      return Temporal.PlainDate.from(data);
    case 't':
      return Temporal.PlainTime.from(data);
    case 'Y':
      return Temporal.PlainYearMonth.from(data);
    case 'M':
      return Temporal.PlainMonthDay.from(data);
    case 'P':
      return Temporal.Duration.from(data);
    default:
      throw new Error(
        'Could not deserialize an unknown Temporal type. The Flight versions ' +
          'of the server and client might not match.',
      );
  }
}
