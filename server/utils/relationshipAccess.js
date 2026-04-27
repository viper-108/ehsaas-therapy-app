import ClientTherapistRelationship from '../models/ClientTherapistRelationship.js';

/**
 * Check whether a therapist has ACTIVE access to a client's records.
 * After a transfer, the old therapist's relationship status is 'past' and they lose access.
 * The new therapist gets an 'active' relationship which gives them read access to ALL the client's
 * historical sessions (across past therapists).
 *
 * @param {string} therapistId
 * @param {string} clientId
 * @returns {Promise<boolean>}
 */
export const hasActiveAccess = async (therapistId, clientId) => {
  if (!therapistId || !clientId) return false;
  const rel = await ClientTherapistRelationship.findOne({
    therapistId,
    clientId,
    status: 'active'
  });
  return !!rel;
};

/**
 * Returns true if therapist's relationship to client is explicitly 'past' (transferred away).
 * Used to deny access to data they shouldn't see anymore.
 */
export const isPastRelationship = async (therapistId, clientId) => {
  if (!therapistId || !clientId) return false;
  const rel = await ClientTherapistRelationship.findOne({
    therapistId,
    clientId,
    status: 'past'
  });
  return !!rel;
};

/**
 * Ensure an active relationship exists. Creates one if missing (idempotent).
 * Called when a client books their first session with a therapist.
 */
export const ensureActiveRelationship = async (therapistId, clientId) => {
  if (!therapistId || !clientId) return null;
  return ClientTherapistRelationship.findOneAndUpdate(
    { clientId, therapistId },
    { $setOnInsert: { status: 'active', startedAt: new Date() } },
    { upsert: true, new: true }
  );
};
