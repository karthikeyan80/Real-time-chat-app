/**
 * Helper utility for channel operations
 */

/**
 * Safely removes a channel by ID from the channels array
 *
 * @param {Array} channels - The current channels array
 * @param {String} channelId - The ID of the channel to remove
 * @returns {Array} - New array with the channel removed
 */
export const removeChannelById = (channels, channelId) => {
  if (!Array.isArray(channels)) {
    console.error("Channels is not an array:", channels);
    return [];
  }

  if (!channelId) {
    console.error("No channelId provided for removal");
    return channels;
  }

  console.log(`Removing channel with ID: ${channelId}`);
  console.log(`Total channels before: ${channels.length}`);

  // Create a new array without the specified channel
  const filteredChannels = channels.filter((channel) => {
    // Safely check for _id existence
    if (!channel || !channel._id) {
      console.warn("Found a channel without _id:", channel);
      return true; // Keep channels without IDs (shouldn't happen)
    }

    // Only remove the exact match
    const shouldKeep = channel._id !== channelId;
    if (!shouldKeep) {
      console.log(`Removing channel: ${channel.name} (${channel._id})`);
    }
    return shouldKeep;
  });

  console.log(`Total channels after: ${filteredChannels.length}`);
  return filteredChannels;
};

/**
 * Adds a channel to the channels array if it doesn't exist
 *
 * @param {Array} channels - The current channels array
 * @param {Object} newChannel - The channel to add
 * @returns {Array} - New array with the channel added
 */
export const addChannelIfNotExists = (channels, newChannel) => {
  if (!Array.isArray(channels)) {
    console.error("Channels is not an array:", channels);
    return [newChannel];
  }

  if (!newChannel || !newChannel._id) {
    console.error("Invalid channel provided for addition");
    return channels;
  }

  // Check if channel already exists
  const exists = channels.some((channel) => channel._id === newChannel._id);

  if (exists) {
    console.log(
      `Channel already exists: ${newChannel.name} (${newChannel._id})`
    );
    return channels;
  }

  console.log(`Adding new channel: ${newChannel.name} (${newChannel._id})`);
  return [newChannel, ...channels];
};
