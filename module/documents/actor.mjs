/**
 * ============================================================================
 * THOUSAND YEAR OLD VAMPIRE - Actor Document Class
 * ============================================================================
 *
 * Custom Actor class for vampire characters with methods for dice rolling
 * and game state management.
 */
export class TYOVActor extends Actor {

  // ==========================================================================
  // DATA PREPARATION
  // ==========================================================================
  prepareDerivedData() {
    super.prepareDerivedData();

    const systemData = this.system;
    if (this.type !== 'vampire') return;

    // Calculate counts
    this._calculateCounts(systemData);
  }

  /**
   * Calculate various counts for the character
   * @private
   */
  _calculateCounts(systemData) {
    // Calculate total memory slots available
    const slots = systemData.memorySlots || { base: 5, bonus: 0, lost: 0 };
    systemData.totalMemorySlots = slots.base + slots.bonus - slots.lost;

    // Count active memories (not struck out, not in diary, not published)
    systemData.activeMemoryCount = systemData.memories.filter(m =>
      !m.struckOut && !m.inDiary && !m.published
    ).length;

    // Count diary memories
    systemData.diaryMemoryCount = systemData.memories.filter(m =>
      m.inDiary && !m.struckOut
    ).length;

    // Count published memories (these don't take up slots)
    systemData.publishedMemoryCount = systemData.memories.filter(m =>
      m.published
    ).length;

    // Count total experiences
    let experienceCount = 0;
    for (const memory of systemData.memories) {
      if (!memory.struckOut) {
        experienceCount += memory.experiences.filter(e => e && e.trim().length > 0).length;
      }
    }
    systemData.experienceCount = experienceCount;

    // Count skills
    systemData.skillCount = systemData.skills.length;
    systemData.checkedSkillCount = systemData.skills.filter(s => s.checked).length;
    systemData.uncheckedSkillCount = systemData.skills.filter(s => !s.checked && !s.lost).length;

    // Count resources
    systemData.resourceCount = systemData.resources.filter(r => !r.lost).length;

    // Count characters
    systemData.mortalCount = systemData.characters.filter(c => c.type === 'mortal' && !c.dead).length;
    systemData.immortalCount = systemData.characters.filter(c => c.type === 'immortal' && !c.dead).length;

    // Count marks
    systemData.markCount = systemData.marks.filter(m => !m.removed).length;
  }

  // ==========================================================================
  // COMPUTED PROPERTIES
  // ==========================================================================

  /**
   * Get all active (not struck out) memories
   */
  get activeMemories() {
    return this.system.memories.filter(m => !m.struckOut && !m.inDiary);
  }

  /**
   * Get all diary memories
   */
  get diaryMemories() {
    return this.system.memories.filter(m => m.inDiary && !m.struckOut);
  }

  /**
   * Get all living characters
   */
  get livingCharacters() {
    return this.system.characters.filter(c => !c.dead);
  }

  /**
   * Get living mortals
   */
  get livingMortals() {
    return this.system.characters.filter(c => c.type === 'mortal' && !c.dead);
  }

  /**
   * Get living immortals
   */
  get livingImmortals() {
    return this.system.characters.filter(c => c.type === 'immortal' && !c.dead);
  }

  /**
   * Get active resources (not lost)
   */
  get activeResources() {
    return this.system.resources.filter(r => !r.lost);
  }

  /**
   * Get active marks (not removed)
   */
  get activeMarks() {
    return this.system.marks.filter(m => !m.removed);
  }

  /**
   * Check if the game has ended
   */
  get isGameOver() {
    return this.system.gameState.ended;
  }

  // ==========================================================================
  // DICE ROLLING METHODS
  // ==========================================================================

  /**
   * Roll the prompt dice (d10 - d6) and determine the next prompt.
   * @returns {Promise<{d10: number, d6: number, result: number, newPrompt: number}>}
   */
  async rollPromptDice() {
    const d10Roll = new Roll("1d10");
    const d6Roll = new Roll("1d6");

    await d10Roll.evaluate();
    await d6Roll.evaluate();

    const d10 = d10Roll.total;
    const d6 = d6Roll.total;
    const result = d10 - d6;

    const currentPrompt = this.system.prompts.current;
    let newPrompt = currentPrompt + result;

    // Cannot go below prompt 1
    if (newPrompt < 1) newPrompt = 1;

    // Determine which entry (a, b, c) based on visit count
    const visitCounts = foundry.utils.deepClone(this.system.prompts.visitCounts);
    const visitCount = (visitCounts[newPrompt] || 0) + 1;
    visitCounts[newPrompt] = visitCount;

    let entry = 'a';
    if (visitCount === 2) entry = 'b';
    else if (visitCount >= 3) entry = 'c';

    // If we've visited 3 times already, skip to next prompt
    if (visitCount > 3) {
      newPrompt += 1;
      visitCounts[newPrompt] = (visitCounts[newPrompt] || 0) + 1;
      entry = visitCounts[newPrompt] === 1 ? 'a' : (visitCounts[newPrompt] === 2 ? 'b' : 'c');
    }

    // Get the prompt text
    const prompt = CONFIG.TYOV.prompts[newPrompt];
    const promptText = prompt ? (prompt[entry] || prompt.a) : "You have reached the end of the prompts. Your story concludes here.";

    // Build chat message
    const direction = result > 0 ? "forward" : (result < 0 ? "backward" : "stay at");
    const messageContent = `
      <div class="tyov-roll prompt-roll">
        <h3>${this.name} - Prompt Roll</h3>
        <div class="dice-results">
          <span class="die d10">${d10}</span>
          <span class="operator">-</span>
          <span class="die d6">${d6}</span>
          <span class="operator">=</span>
          <span class="result ${result >= 0 ? 'positive' : 'negative'}">${result >= 0 ? '+' : ''}${result}</span>
        </div>
        <p class="move-description">Move ${direction} ${Math.abs(result)} prompt${Math.abs(result) !== 1 ? 's' : ''}</p>
        <hr>
        <h4>Prompt ${newPrompt}${entry}</h4>
        <p class="prompt-text">${promptText}</p>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: messageContent,
      rolls: [d10Roll, d6Roll]
    });

    // Update the actor's prompt tracking
    const history = foundry.utils.deepClone(this.system.prompts.history);
    history.push({
      from: currentPrompt,
      to: newPrompt,
      entry: entry,
      d10: d10,
      d6: d6,
      result: result
    });

    await this.update({
      "system.prompts.current": newPrompt,
      "system.prompts.history": history,
      "system.prompts.visitCounts": visitCounts
    });

    return { d10, d6, result, newPrompt, entry };
  }

  /**
   * Go to a specific prompt (for manual navigation)
   * @param {number} promptNumber - The prompt to go to
   * @param {string} entry - The entry (a, b, or c)
   */
  async goToPrompt(promptNumber, entry = null) {
    const visitCounts = foundry.utils.deepClone(this.system.prompts.visitCounts);

    if (!entry) {
      const visitCount = (visitCounts[promptNumber] || 0) + 1;
      visitCounts[promptNumber] = visitCount;
      entry = visitCount === 1 ? 'a' : (visitCount === 2 ? 'b' : 'c');
    }

    const prompt = CONFIG.TYOV.prompts[promptNumber];
    const promptText = prompt ? (prompt[entry] || prompt.a) : "Unknown prompt.";

    const messageContent = `
      <div class="tyov-prompt-message">
        <h3>Prompt ${promptNumber}${entry}</h3>
        <p class="prompt-text">${promptText}</p>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: messageContent
    });

    const history = foundry.utils.deepClone(this.system.prompts.history);
    history.push({
      from: this.system.prompts.current,
      to: promptNumber,
      entry: entry,
      manual: true
    });

    await this.update({
      "system.prompts.current": promptNumber,
      "system.prompts.history": history,
      "system.prompts.visitCounts": visitCounts
    });
  }

  // ==========================================================================
  // TRAIT MANAGEMENT METHODS
  // ==========================================================================

  /**
   * Add a new skill
   * @param {string} name - The skill name
   */
  async addSkill(name) {
    if (!name || !name.trim()) return;

    const skills = foundry.utils.deepClone(this.system.skills);
    skills.push({
      id: foundry.utils.randomID(),
      name: name.trim(),
      checked: false,
      lost: false
    });

    await this.update({ "system.skills": skills });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="tyov-trait-change"><strong>${this.name}</strong> gained the Skill: <em>${name}</em></div>`
    });
  }

  /**
   * Check a skill
   * @param {string} skillId - The skill ID to check
   */
  async checkSkill(skillId) {
    const skills = foundry.utils.deepClone(this.system.skills);
    const skill = skills.find(s => s.id === skillId);

    if (skill && !skill.checked && !skill.lost) {
      skill.checked = true;
      await this.update({ "system.skills": skills });

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<div class="tyov-trait-change"><strong>${this.name}</strong> checked the Skill: <em>${skill.name}</em></div>`
      });
    }
  }

  /**
   * Lose a skill (strike it out)
   * @param {string} skillId - The skill ID to lose
   */
  async loseSkill(skillId) {
    const skills = foundry.utils.deepClone(this.system.skills);
    const skill = skills.find(s => s.id === skillId);

    if (skill && !skill.lost) {
      skill.lost = true;
      await this.update({ "system.skills": skills });

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<div class="tyov-trait-change tyov-loss"><strong>${this.name}</strong> lost the Skill: <em>${skill.name}</em></div>`
      });
    }
  }

  /**
   * Add a new resource
   * @param {string} name - The resource name
   * @param {boolean} stationary - Whether this is a stationary resource
   */
  async addResource(name, stationary = false) {
    if (!name || !name.trim()) return;

    const resources = foundry.utils.deepClone(this.system.resources);
    resources.push({
      id: foundry.utils.randomID(),
      name: name.trim(),
      stationary: stationary,
      lost: false,
      isDiary: false
    });

    await this.update({ "system.resources": resources });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="tyov-trait-change"><strong>${this.name}</strong> gained the Resource: <em>${name}</em>${stationary ? ' (Stationary)' : ''}</div>`
    });
  }

  /**
   * Lose a resource
   * @param {string} resourceId - The resource ID to lose
   */
  async loseResource(resourceId) {
    const resources = foundry.utils.deepClone(this.system.resources);
    const resource = resources.find(r => r.id === resourceId);

    if (resource && !resource.lost) {
      resource.lost = true;
      await this.update({ "system.resources": resources });

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<div class="tyov-trait-change tyov-loss"><strong>${this.name}</strong> lost the Resource: <em>${resource.name}</em></div>`
      });
    }
  }

  /**
   * Add a new character
   * @param {string} name - The character name
   * @param {string} type - 'mortal' or 'immortal'
   * @param {string} description - Character description
   */
  async addCharacter(name, type = 'mortal', description = '') {
    if (!name || !name.trim()) return;

    const characters = foundry.utils.deepClone(this.system.characters);
    characters.push({
      id: foundry.utils.randomID(),
      name: name.trim(),
      type: type,
      description: description,
      dead: false,
      relationship: ''
    });

    await this.update({ "system.characters": characters });

    const typeLabel = type === 'mortal' ? 'Mortal' : 'Immortal';
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="tyov-trait-change"><strong>${this.name}</strong> met a new ${typeLabel}: <em>${name}</em></div>`
    });
  }

  /**
   * Kill a character
   * @param {string} characterId - The character ID
   */
  async killCharacter(characterId) {
    const characters = foundry.utils.deepClone(this.system.characters);
    const character = characters.find(c => c.id === characterId);

    if (character && !character.dead) {
      character.dead = true;
      await this.update({ "system.characters": characters });

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<div class="tyov-trait-change tyov-loss"><strong>${character.name}</strong> has died.</div>`
      });
    }
  }

  /**
   * Add a new mark
   * @param {string} description - The mark description
   */
  async addMark(description) {
    if (!description || !description.trim()) return;

    const marks = foundry.utils.deepClone(this.system.marks);
    marks.push({
      id: foundry.utils.randomID(),
      description: description.trim(),
      removed: false
    });

    await this.update({ "system.marks": marks });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="tyov-trait-change"><strong>${this.name}</strong> received a Mark: <em>${description}</em></div>`
    });
  }

  /**
   * Remove a mark
   * @param {string} markId - The mark ID
   */
  async removeMark(markId) {
    const marks = foundry.utils.deepClone(this.system.marks);
    const mark = marks.find(m => m.id === markId);

    if (mark && !mark.removed) {
      mark.removed = true;
      await this.update({ "system.marks": marks });

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<div class="tyov-trait-change"><strong>${this.name}</strong> removed the Mark: <em>${mark.description}</em></div>`
      });
    }
  }

  /**
   * Strike out a memory
   * @param {number} memoryIndex - The memory index (0-4)
   */
  async strikeOutMemory(memoryIndex) {
    const memories = foundry.utils.deepClone(this.system.memories);

    if (memories[memoryIndex] && !memories[memoryIndex].struckOut) {
      // Cannot strike out published memories
      if (memories[memoryIndex].published) {
        ui.notifications.warn("Published memories cannot be struck out.");
        return;
      }

      memories[memoryIndex].struckOut = true;
      await this.update({ "system.memories": memories });

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<div class="tyov-trait-change tyov-loss"><strong>${this.name}</strong> has forgotten Memory ${memoryIndex + 1}.</div>`
      });
    }
  }

  /**
   * Add a bonus memory slot (Prompt 52a)
   * @param {string} theme - Optional theme for the new memory (e.g., "beauty, nature, or peace")
   */
  async addMemorySlot(theme = '') {
    const memorySlots = foundry.utils.deepClone(this.system.memorySlots);
    const memories = foundry.utils.deepClone(this.system.memories);

    memorySlots.bonus += 1;

    // Add a new empty memory
    const newMemoryNumber = memories.length + 1;
    memories.push({
      id: `memory-${foundry.utils.randomID()}`,
      theme: theme,
      experiences: ["", "", ""],
      inDiary: false,
      struckOut: false,
      published: false
    });

    await this.update({
      "system.memorySlots": memorySlots,
      "system.memories": memories
    });

    const themeText = theme ? ` (dedicated to ${theme})` : '';
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="tyov-trait-change"><strong>${this.name}</strong> gained an additional Memory slot${themeText}.</div>`
    });
  }

  /**
   * Lose a memory slot permanently (Prompts 22c, 41a)
   */
  async loseMemorySlot() {
    const memorySlots = foundry.utils.deepClone(this.system.memorySlots);
    const totalSlots = memorySlots.base + memorySlots.bonus - memorySlots.lost;

    if (totalSlots <= 1) {
      ui.notifications.warn("Cannot lose your last memory slot.");
      return;
    }

    memorySlots.lost += 1;

    await this.update({ "system.memorySlots": memorySlots });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="tyov-trait-change tyov-loss"><strong>${this.name}</strong> has permanently lost a Memory slot. (Now ${totalSlots - 1} slots)</div>`
    });
  }

  /**
   * Publish a memory (Prompt 33b) - makes it permanent and no longer takes up a slot
   * @param {number} memoryIndex - The memory index
   */
  async publishMemory(memoryIndex) {
    const memories = foundry.utils.deepClone(this.system.memories);

    if (memories[memoryIndex] && !memories[memoryIndex].struckOut && !memories[memoryIndex].published) {
      memories[memoryIndex].published = true;
      // Remove from diary if it was there
      memories[memoryIndex].inDiary = false;

      await this.update({ "system.memories": memories });

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<div class="tyov-trait-change"><strong>${this.name}</strong> has published Memory ${memoryIndex + 1}. It can never be lost or changed, and no longer takes up a Memory slot.</div>`
      });
    }
  }

  /**
   * Get the number of available (usable) memory slots
   */
  get availableMemorySlots() {
    const slots = this.system.memorySlots || { base: 5, bonus: 0, lost: 0 };
    const totalSlots = slots.base + slots.bonus - slots.lost;
    // Subtract memories that are active (not struck out, not in diary, not published)
    const usedSlots = this.system.memories.filter(m =>
      !m.struckOut && !m.inDiary && !m.published
    ).length;
    return totalSlots - usedSlots;
  }

  /**
   * Get the total number of memory slots
   */
  get totalMemorySlots() {
    const slots = this.system.memorySlots || { base: 5, bonus: 0, lost: 0 };
    return slots.base + slots.bonus - slots.lost;
  }

  /**
   * Move a memory to the diary
   * @param {number} memoryIndex - The memory index
   */
  async moveMemoryToDiary(memoryIndex) {
    const memories = foundry.utils.deepClone(this.system.memories);
    const diary = foundry.utils.deepClone(this.system.diary);

    if (memories[memoryIndex] && !memories[memoryIndex].struckOut && !memories[memoryIndex].inDiary) {
      // Check if diary exists and has room
      const diaryMemoryCount = memories.filter(m => m.inDiary).length;

      if (diaryMemoryCount >= CONFIG.TYOV.maxDiaryMemories) {
        ui.notifications.warn("Your Diary is full (maximum 4 memories).");
        return;
      }

      memories[memoryIndex].inDiary = true;
      diary.exists = true;

      await this.update({
        "system.memories": memories,
        "system.diary": diary
      });

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<div class="tyov-trait-change"><strong>${this.name}</strong> recorded Memory ${memoryIndex + 1} in their Diary.</div>`
      });
    }
  }

  /**
   * Create a diary resource if one doesn't exist
   * @param {string} description - Description of the diary
   */
  async createDiary(description) {
    if (this.system.diary.exists) {
      ui.notifications.warn("You already have a Diary.");
      return;
    }

    const diary = {
      exists: true,
      description: description || "A leather-bound journal"
    };

    // Also add it as a resource
    const resources = foundry.utils.deepClone(this.system.resources);
    resources.push({
      id: foundry.utils.randomID(),
      name: `Diary: ${diary.description}`,
      stationary: false,
      lost: false,
      isDiary: true
    });

    await this.update({
      "system.diary": diary,
      "system.resources": resources
    });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="tyov-trait-change"><strong>${this.name}</strong> created a Diary: <em>${diary.description}</em></div>`
    });
  }

  /**
   * Add a journal entry
   * @param {number} promptNumber - The prompt this entry responds to
   * @param {string} entry - The entry letter (a, b, c)
   * @param {string} content - The journal content
   */
  async addJournalEntry(promptNumber, entry, content) {
    const journal = foundry.utils.deepClone(this.system.journal);
    journal.push({
      id: foundry.utils.randomID(),
      promptNumber: promptNumber,
      entry: entry,
      content: content,
      timestamp: Date.now()
    });

    await this.update({ "system.journal": journal });
  }

  /**
   * End the game
   * @param {string} reason - The reason the game ended
   */
  async endGame(reason = "The vampire's story has concluded.") {
    await this.update({
      "system.gameState.ended": true,
      "system.gameState.endReason": reason
    });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `
        <div class="tyov-game-end">
          <h2>The End</h2>
          <p><strong>${this.name}</strong>'s story has concluded.</p>
          <p><em>${reason}</em></p>
        </div>
      `
    });
  }
}
