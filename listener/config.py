"""Settings for the band listener. The band number lives here and nowhere else."""
from pathlib import Path

BAND = 24                         # our band: Vexo-HACK-24 (number on the band's bag)
WEARER = "Mapa"                   # who wears the band; Claude names the wearer's voice with this

ROOT = Path(__file__).resolve().parent.parent
KIT = ROOT / "vexo-open-kit"      # local clone of github.com/VexoAI-Org/vexo-open-kit (gitignored)
DATA_FILE = ROOT / "data" / "interactions.json"      # real conversations: gitignored, never committed
LIVE_FILE = ROOT / "data" / "live.json"             # the conversation in progress, for the Live page
PROMPT_FILE = ROOT / "prompts" / "interaction.md"    # Claude's instructions (Mapa owns the wording)

MODEL = "claude-opus-5-5"
MAX_SECONDS = 600                 # an interaction stops by itself after 10 minutes

# Always-on: the microphone never turns off. The stream is cut into interactions by silence.
SILENCE_GAP = 60                  # this many seconds with no words ends the current interaction
MAX_INTERACTION = 15 * 60         # a non-stop conversation is still saved every 15 minutes

# LED colours for each state, so the wearer knows what the band is doing.
LED_IDLE = "#202020"              # dim white: connected, waiting for a tap
LED_THINKING = "#a050ff"          # purple blink: Claude is reading the conversation
LED_SAVED = "#00ff60"             # green: interaction saved
LED_ERROR = "#ff2020"             # red: something failed (the terminal says what)
