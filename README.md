# Thousand Year Old Vampire - Foundry VTT System

A Foundry VTT game system for playing *Thousand Year Old Vampire*, the solo journaling RPG by Tim Hutchings.

## About the Game

*Thousand Year Old Vampire* is a lonely solo role-playing game where you chronicle the unlife of a vampire over many centuries, from the loss of mortality to their inevitable destruction. Through prompts and dice rolls, you explore your vampire's human failings, villainous acts, and surprising victories.

## Features

- **Character Sheet** for tracking your vampire's:
  - **Memories** (5 slots, each holding up to 3 Experiences)
  - **Skills** (can be checked or lost)
  - **Resources** (can be stationary or portable)
  - **Characters** (Mortals and Immortals)
  - **Marks** (physical signs of vampirism)
  - **Diary** (preserves Memories that would otherwise be lost)

- **Prompt Navigation**
  - Roll d10 - d6 to determine movement through prompts
  - Automatic tracking of which prompts you've visited
  - Manual prompt navigation option

- **Journaling Support**
  - Write detailed chronicle entries for each prompt
  - Track your vampire's story over centuries

## Installation

### Manual Installation
1. Copy this folder to your Foundry VTT Data systems directory:
   - Windows: `%localappdata%/FoundryVTT/Data/systems/`
   - macOS: `~/Library/Application Support/FoundryVTT/Data/systems/`
   - Linux: `~/.local/share/FoundryVTT/Data/systems/`

2. Rename the folder to `tyov`

3. Restart Foundry VTT

### Creating a Symlink (for development)
```bash
ln -s /path/to/1kVampire ~/.local/share/FoundryVTT/Data/systems/tyov
```

## How to Play

1. Create a new World using the "Thousand Year Old Vampire" system
2. Create a new Actor (your vampire)
3. Fill in your vampire's origin and initial traits:
   - 3 Skills
   - 3 Resources
   - 3+ Mortal Characters
   - 1 Immortal (your creator)
   - 1 Mark
   - 1 Experience in each of the 5 Memories

4. Click "Roll Prompt Dice" to navigate through prompts
5. Answer each prompt by modifying your traits and writing Experiences
6. Continue until the game ends

## Game Rules Summary

### Memories & Experiences
- Each Memory can hold up to 3 Experiences
- When all Memories are full and you need a new one, strike out an existing Memory
- Alternatively, move a Memory to your Diary to preserve it (up to 4)

### Skills
- Skills can be "checked" when used
- If you need to check a Skill but have none unchecked, lose a Resource instead
- Skills can be lost (struck out)

### Resources
- Some Resources are "stationary" and cannot travel with you
- Resources can be lost
- If you must lose a Resource but have none, check a Skill instead

### Characters
- Mortals age and die over time (every 4-5 prompts)
- Immortals do not age
- Characters can be killed by prompts

### The Game Ends When
- You cannot check or lose a Skill/Resource when required
- A prompt specifically ends the game
- You choose to end your vampire's story

## Credits

- **Original Game**: *Thousand Year Old Vampire* by Tim Hutchings
- **Foundry VTT System**: Created for personal use

## License

This is an unofficial, fan-made system for personal use. *Thousand Year Old Vampire* is copyrighted by Tim Hutchings. Please support the original creator by purchasing the official game.
