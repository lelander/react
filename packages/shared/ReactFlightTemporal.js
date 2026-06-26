/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Single source of truth for how TC39 Temporal values are encoded in the React
// Flight protocol. Both directions (Server <-> Client) and both the model and the
// reply streams go through these helpers.
//
// Wire format: '$t' + a 1-character type code + the RFC 9557 string produced by
// the value's toJSON method. The concrete type must be carried explicitly because
// the string forms overlap (Temporal.Instant looks like a Date, Temporal.PlainDate
// is a prefix of Temporal.PlainDateTime, ...) and reconstruction is type-specific
// (Temporal.<Type>.from).

// Maps the 1-character wire code to the Temporal type name. This is the only place
// the codes are defined; the encoder lookup below is derived from it.
const temporalTypeNamesByCode: {+[code: string]: string} = {
  I: 'Instant',
  Z: 'ZonedDateTime',
  d: 'PlainDate',
  D: 'PlainDateTime',
  t: 'PlainTime',
  y: 'PlainYearMonth',
  m: 'PlainMonthDay',
  u: 'Duration',
};

// Maps the Symbol.toStringTag ('Temporal.PlainDate') to the wire code ('d'),
// derived from the table above so the codes are only maintained in one place.
const temporalCodesByTag: {[tag: string]: string} = {};
const temporalCodes = Object.keys(temporalTypeNamesByCode);
for (let i = 0; i < temporalCodes.length; i++) {
  const code = temporalCodes[i];
  temporalCodesByTag['Temporal.' + temporalTypeNamesByCode[code]] = code;
}

export function getTemporalTypeCode(value: mixed): void | string {
  // Temporal objects expose a spec-defined Symbol.toStringTag ('Temporal.PlainDate',
  // etc.) on both the native implementation and the standard polyfills, so we can
  // detect them structurally without depending on a Temporal implementation being
  // loaded here.
  if (value === null || typeof value !== 'object') {
    return undefined;
  }
  const tag = (value as any)[Symbol.toStringTag];
  if (typeof tag === 'string') {
    return temporalCodesByTag[tag];
  }
  return undefined;
}

export function serializeTemporal(
  typeCode: string,
  temporalJSON: string,
): string {
  // Like Date, a Temporal value is turned into a string by its toJSON method. We
  // tack on a '$t' prefix plus the 1-character type code so the receiver can call
  // the matching Temporal.<Type>.from() to reconstruct it.
  return '$t' + typeCode + temporalJSON;
}

export function parseTemporalValue(value: string): mixed {
  // value is '$t' + a 1-character type code + the RFC 9557 string from toJSON.
  const Temporal = (globalThis as any).Temporal;
  if (Temporal == null) {
    throw new Error(
      'A Temporal value was received but no Temporal implementation is available ' +
        'in this environment. Use a runtime with native Temporal support, or load ' +
        'a Temporal polyfill that defines globalThis.Temporal.',
    );
  }
  const constructorName = temporalTypeNamesByCode[value[2]];
  if (constructorName === undefined) {
    throw new Error('Unknown Temporal type code "' + value[2] + '".');
  }
  return Temporal[constructorName].from(value.slice(3));
}
