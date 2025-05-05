import express from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Eleven Labs API configuration
const ELEVEN_LABS_API_KEY =
  "sk_92809944e89dd94c0b97a76b66dca71b5178557fb18c333d";
const ELEVEN_LABS_API_URL = "https://api.elevenlabs.io/v1";

// Available voices from Eleven Labs
const AVAILABLE_VOICES = {
  Rachel: "21m00Tcm4TlvDq8ikWAM", // Warm, friendly female voice
  Domi: "AZnzlk1XvdvUeBnXmlld", // Professional female voice
  Bella: "EXAVITQu4vr4xnSDxMaL", // Soft, gentle female voice
  Antoni: "ErXwobaYiN019PkySvjV", // Warm, male voice
  Arnold: "VR6AewLTigWG4xSOukaG", // Deep, male voice
  Adam: "pNInz6obpgDQGcFmaJgB", // Casual, male voice
};

// Function to clean text for TTS by removing emojis and special characters
const cleanTextForTTS = (text) => {
  if (!text) return "";

  // Remove emojis and special characters, keep only text and basic punctuation
  const cleanText = text
    .replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3297}\u{3299}\u{303D}\u{00A9}\u{00AE}\u{2122}\u{23F3}\u{24C2}\u{23E9}-\u{23EF}\u{25AA}-\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2600}-\u{2604}\u{260E}\u{2611}\u{2614}-\u{2615}\u{2618}\u{2620}\u{2622}-\u{2623}\u{2626}\u{262A}\u{262E}-\u{262F}\u{2638}-\u{263A}\u{2648}-\u{2653}\u{2660}\u{2663}\u{2665}-\u{2666}\u{2668}\u{267B}\u{267E}-\u{267F}\u{2692}-\u{2697}\u{2699}\u{269B}-\u{269C}\u{26A0}-\u{26A1}\u{26A7}\u{26AA}-\u{26AB}\u{26B0}-\u{26B1}\u{26BD}-\u{26BE}\u{26C4}-\u{26C5}\u{26C8}\u{26CF}\u{26D1}\u{26D3}-\u{26D4}\u{26E9}-\u{26EA}\u{26F0}-\u{26F5}\u{26F7}-\u{26FA}\u{26FD}\u{26FF}\u{2702}\u{2705}\u{2708}-\u{270D}\u{270F}\u{2712}\u{2714}\u{2716}\u{271D}\u{2721}\u{2733}-\u{2734}\u{2744}\u{2747}\u{2757}\u{2763}-\u{2764}\u{2795}-\u{2797}\u{27A1}\u{27B0}\u{27BF}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{1F191}-\u{1F19A}\u{1F1E6}-\u{1F1FF}\u{1F201}-\u{1F202}\u{1F21A}\u{1F22F}\u{1F232}-\u{1F23A}\u{1F250}-\u{1F251}\u{1F300}-\u{1F321}\u{1F324}-\u{1F393}\u{1F396}-\u{1F397}\u{1F399}-\u{1F39B}\u{1F39E}-\u{1F3F0}\u{1F3F3}-\u{1F3F5}\u{1F3F7}-\u{1F3FA}\u{1F400}-\u{1F4FD}\u{1F4FF}-\u{1F53D}\u{1F549}-\u{1F54E}\u{1F550}-\u{1F567}\u{1F56F}-\u{1F570}\u{1F573}-\u{1F57A}\u{1F587}\u{1F58A}-\u{1F58D}\u{1F590}\u{1F595}-\u{1F596}\u{1F5A4}-\u{1F5A5}\u{1F5A8}\u{1F5B1}-\u{1F5B2}\u{1F5BC}\u{1F5C2}-\u{1F5C4}\u{1F5D1}-\u{1F5D3}\u{1F5DC}-\u{1F5DE}\u{1F5E1}\u{1F5E3}\u{1F5E8}\u{1F5EF}\u{1F5F3}\u{1F5FA}-\u{1F64F}\u{1F680}-\u{1F6C5}\u{1F6CB}-\u{1F6D2}\u{1F6E0}-\u{1F6E5}\u{1F6E9}\u{1F6EB}-\u{1F6EC}\u{1F6F0}\u{1F6F3}\u{1F910}-\u{1F93A}\u{1F93C}-\u{1F93E}\u{1F940}-\u{1F970}\u{1F973}-\u{1F976}\u{1F97A}\u{1F97C}\u{1F980}-\u{1F984}\u{1F986}-\u{1F98A}\u{1F98C}-\u{1F990}\u{1F992}-\u{1F997}\u{1F9C0}\u{1F9D0}-\u{1F9FF}]/gu,
      ""
    )
    .replace(/[^\p{L}\p{N}\s.,!?]/gu, "")
    .trim();

  return cleanText;
};

// Function to check if text contains valid content for TTS
const hasValidTextForTTS = (text) => {
  if (!text) return false;
  const cleanText = cleanTextForTTS(text);
  return cleanText.length > 0;
};

// Function to generate audio using Eleven Labs API
const generateAudio = async (text, voiceId) => {
  try {
    console.log(
      `Generating audio for text: "${text.substring(
        0,
        50
      )}..." with voice ID: ${voiceId}`
    );

    const response = await axios({
      method: "POST",
      url: `${ELEVEN_LABS_API_URL}/text-to-speech/${voiceId}`,
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVEN_LABS_API_KEY,
      },
      data: {
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      responseType: "arraybuffer",
    });

    // Generate unique filename
    const filename = `${uuidv4()}.mp3`;
    const filepath = path.join(__dirname, "../uploads/audio", filename);

    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }

    // Save the audio file
    fs.writeFileSync(filepath, response.data);
    console.log(`Audio file saved: ${filename}`);

    return filename;
  } catch (error) {
    console.error(
      "Error generating audio:",
      error.response?.data || error.message
    );
    throw new Error(`Failed to generate audio: ${error.message}`);
  }
};

// Function to send voice message
const sendVoiceMessage = async (recipientId, text, voiceName) => {
  try {
    console.log(
      `Sending voice message to ${recipientId} with voice ${voiceName}`
    );

    const voiceId = AVAILABLE_VOICES[voiceName];
    if (!voiceId) {
      throw new Error(`Invalid voice selected: ${voiceName}`);
    }

    // Clean the text for TTS
    const cleanText = cleanTextForTTS(text);

    // Check if there's valid text to convert
    if (!hasValidTextForTTS(text)) {
      throw new Error("No valid text content to convert to speech");
    }

    const audioFilename = await generateAudio(cleanText, voiceId);
    const result = {
      audioUrl: `/uploads/audio/${audioFilename}`,
      voiceName,
    };

    console.log(`Voice message generated successfully: ${result.audioUrl}`);
    return result;
  } catch (error) {
    console.error("Error in sendVoiceMessage:", error.message);
    throw error;
  }
};

// Route to get available voices
router.get("/voices", (req, res) => {
  try {
    const voices = Object.keys(AVAILABLE_VOICES);
    console.log("Available voices:", voices);
    res.json({ voices });
  } catch (error) {
    console.error("Error getting voices:", error);
    res.status(500).json({ error: "Failed to get available voices" });
  }
});

// Route to send TTS voice message
router.post("/send-voice", async (req, res) => {
  const { recipientId, text, voiceName } = req.body;

  if (!recipientId || !text || !voiceName) {
    console.error("Missing required fields:", {
      recipientId,
      text: text?.substring(0, 50),
      voiceName,
    });
    return res.status(400).json({
      error: "All fields are required.",
      details: {
        recipientId: !recipientId ? "Missing recipient ID" : null,
        text: !text ? "Missing text" : null,
        voiceName: !voiceName ? "Missing voice name" : null,
      },
    });
  }

  // Check if there's valid text to convert
  if (!hasValidTextForTTS(text)) {
    return res.status(400).json({
      error: "No valid text content to convert to speech.",
      details: "The message contains only emojis or special characters.",
    });
  }

  try {
    const result = await sendVoiceMessage(recipientId, text, voiceName);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error sending voice message:", error.message);
    res.status(500).json({
      error: "Failed to send voice message.",
      details: error.message,
    });
  }
});

export default router;
