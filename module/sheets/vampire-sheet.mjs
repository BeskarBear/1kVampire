/**
 * ============================================================================
 * THOUSAND YEAR OLD VAMPIRE - Vampire Sheet Class (ApplicationV2)
 * ============================================================================
 *
 * The character sheet for vampire actors using Foundry's V2 Application framework.
 */

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class VampireSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  // ==========================================================================
  // STATIC CONFIGURATION
  // ==========================================================================

  static DEFAULT_OPTIONS = {
    classes: ["tyov", "sheet", "actor", "vampire"],
    position: {
      width: 800,
      height: 900
    },
    window: {
      resizable: true
    },
    actions: {
      rollPromptDice: VampireSheet.#onRollPromptDice,
      goToPrompt: VampireSheet.#onGoToPrompt,
      addSkill: VampireSheet.#onAddSkill,
      checkSkill: VampireSheet.#onCheckSkill,
      uncheckSkill: VampireSheet.#onUncheckSkill,
      loseSkill: VampireSheet.#onLoseSkill,
      addResource: VampireSheet.#onAddResource,
      loseResource: VampireSheet.#onLoseResource,
      addCharacter: VampireSheet.#onAddCharacter,
      killCharacter: VampireSheet.#onKillCharacter,
      addMark: VampireSheet.#onAddMark,
      removeMark: VampireSheet.#onRemoveMark,
      strikeOutMemory: VampireSheet.#onStrikeOutMemory,
      moveMemoryToDiary: VampireSheet.#onMoveMemoryToDiary,
      publishMemory: VampireSheet.#onPublishMemory,
      addMemorySlot: VampireSheet.#onAddMemorySlot,
      loseMemorySlot: VampireSheet.#onLoseMemorySlot,
      createDiary: VampireSheet.#onCreateDiary,
      addJournalEntry: VampireSheet.#onAddJournalEntry,
      endGame: VampireSheet.#onEndGame,
      editImage: VampireSheet.#onEditImage,
      launchWizard: VampireSheet.#onLaunchWizard
    },
    form: {
      submitOnChange: true
    }
  };

  static PARTS = {
    sheet: {
      template: "systems/tyov/templates/actor/vampire-sheet.hbs"
    }
  };

  tabGroups = {
    primary: "memories"
  };

  // ==========================================================================
  // DATA PREPARATION
  // ==========================================================================

  get title() {
    return this.actor.system.biography.currentName || this.actor.name || "Vampire";
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actorData = this.actor.toObject(false);

    context.actor = this.actor;
    context.system = actorData.system;
    context.config = CONFIG.TYOV;
    context.editable = this.isEditable;

    // Prepare memories data
    context.memoriesData = this._prepareMemoriesData(context.system.memories);

    // Prepare skills data
    context.skillsData = this._prepareSkillsData(context.system.skills);

    // Prepare resources data
    context.resourcesData = this._prepareResourcesData(context.system.resources);

    // Prepare characters data
    context.charactersData = this._prepareCharactersData(context.system.characters);

    // Prepare marks data
    context.marksData = this._prepareMarksData(context.system.marks);

    // Current prompt info
    context.currentPrompt = context.system.prompts.current;
    context.currentPromptData = CONFIG.TYOV.prompts[context.currentPrompt];

    // Memory slot info
    const slots = context.system.memorySlots || { base: 5, bonus: 0, lost: 0 };
    context.totalMemorySlots = slots.base + slots.bonus - slots.lost;
    context.memorySlots = slots;

    // Game state
    context.isGameOver = context.system.gameState.ended;

    // Check if actor needs wizard (for showing the wizard button prominently)
    context.needsWizard = game.tyov?.actorNeedsWizard?.(this.actor) ?? false;

    // Tabs
    context.tabs = this._prepareTabs(options);

    return context;
  }

  _prepareTabs(options) {
    const tabs = {
      memories: {
        id: "memories",
        group: "primary",
        icon: "fas fa-brain",
        label: "Memories",
        active: false,
        cssClass: ""
      },
      traits: {
        id: "traits",
        group: "primary",
        icon: "fas fa-list",
        label: "Traits",
        active: false,
        cssClass: ""
      },
      characters: {
        id: "characters",
        group: "primary",
        icon: "fas fa-users",
        label: "Characters",
        active: false,
        cssClass: ""
      },
      journal: {
        id: "journal",
        group: "primary",
        icon: "fas fa-book",
        label: "Journal",
        active: false,
        cssClass: ""
      }
    };

    const activeTab = this.tabGroups.primary || "memories";
    if (tabs[activeTab]) {
      tabs[activeTab].active = true;
      tabs[activeTab].cssClass = "active";
    }

    return tabs;
  }

  _prepareMemoriesData(memories) {
    return memories.map((memory, index) => ({
      ...memory,
      index: index,
      number: index + 1,
      experienceCount: memory.experiences.filter(e => e && e.trim().length > 0).length,
      isEmpty: !memory.experiences.some(e => e && e.trim().length > 0),
      isAvailable: !memory.struckOut && !memory.inDiary && !memory.published,
      canPublish: !memory.struckOut && !memory.published && memory.experiences.some(e => e && e.trim().length > 0)
    }));
  }

  _prepareSkillsData(skills) {
    return {
      active: skills.filter(s => !s.lost),
      lost: skills.filter(s => s.lost),
      checked: skills.filter(s => s.checked && !s.lost),
      unchecked: skills.filter(s => !s.checked && !s.lost)
    };
  }

  _prepareResourcesData(resources) {
    return {
      active: resources.filter(r => !r.lost),
      lost: resources.filter(r => r.lost),
      stationary: resources.filter(r => r.stationary && !r.lost),
      portable: resources.filter(r => !r.stationary && !r.lost)
    };
  }

  _prepareCharactersData(characters) {
    return {
      living: characters.filter(c => !c.dead),
      dead: characters.filter(c => c.dead),
      mortals: characters.filter(c => c.type === 'mortal' && !c.dead),
      immortals: characters.filter(c => c.type === 'immortal' && !c.dead)
    };
  }

  _prepareMarksData(marks) {
    return {
      active: marks.filter(m => !m.removed),
      removed: marks.filter(m => m.removed)
    };
  }

  // ==========================================================================
  // RENDERING
  // ==========================================================================

  _onRender(context, options) {
    super._onRender(context, options);

    if (!this.isEditable) return;

    const html = this.element;

    // Tab click handling
    html.querySelectorAll('.sheet-tabs .item').forEach(tab => {
      tab.addEventListener('click', this._onTabClick.bind(this));
    });
  }

  _onTabClick(event) {
    event.preventDefault();
    const tab = event.currentTarget;
    const tabName = tab.dataset.tab;
    const group = tab.closest('.tabs').dataset.group || 'primary';

    this.tabGroups[group] = tabName;

    const tabContainer = tab.closest('.tabs');
    tabContainer.querySelectorAll('.item').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const body = this.element.querySelector('.sheet-body');
    body.querySelectorAll('.tab').forEach(content => {
      content.classList.toggle('active', content.dataset.tab === tabName);
    });
  }

  // ==========================================================================
  // ACTION HANDLERS
  // ==========================================================================

  static async #onRollPromptDice(event, target) {
    event.preventDefault();
    await this.actor.rollPromptDice();
  }

  static async #onGoToPrompt(event, target) {
    event.preventDefault();
    const promptNumber = parseInt(target.dataset.prompt);
    if (promptNumber) {
      await this.actor.goToPrompt(promptNumber);
    }
  }

  static async #onAddSkill(event, target) {
    event.preventDefault();
    const input = this.element.querySelector('input[name="new-skill"]');
    if (input && input.value.trim()) {
      await this.actor.addSkill(input.value.trim());
      input.value = '';
    }
  }

  static async #onCheckSkill(event, target) {
    event.preventDefault();
    const skillId = target.dataset.skillId;
    if (skillId) {
      await this.actor.checkSkill(skillId);
    }
  }

  static async #onUncheckSkill(event, target) {
    event.preventDefault();
    const skillId = target.dataset.skillId;
    if (skillId) {
      const skills = foundry.utils.deepClone(this.actor.system.skills);
      const skill = skills.find(s => s.id === skillId);
      if (skill) {
        skill.checked = false;
        await this.actor.update({ "system.skills": skills });
      }
    }
  }

  static async #onLoseSkill(event, target) {
    event.preventDefault();
    const skillId = target.dataset.skillId;
    if (skillId) {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Lose Skill" },
        content: "<p>Are you sure you want to lose this skill?</p>"
      });
      if (confirmed) {
        await this.actor.loseSkill(skillId);
      }
    }
  }

  static async #onAddResource(event, target) {
    event.preventDefault();
    const nameInput = this.element.querySelector('input[name="new-resource"]');
    const stationaryCheckbox = this.element.querySelector('input[name="new-resource-stationary"]');

    if (nameInput && nameInput.value.trim()) {
      const stationary = stationaryCheckbox ? stationaryCheckbox.checked : false;
      await this.actor.addResource(nameInput.value.trim(), stationary);
      nameInput.value = '';
      if (stationaryCheckbox) stationaryCheckbox.checked = false;
    }
  }

  static async #onLoseResource(event, target) {
    event.preventDefault();
    const resourceId = target.dataset.resourceId;
    if (resourceId) {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Lose Resource" },
        content: "<p>Are you sure you want to lose this resource?</p>"
      });
      if (confirmed) {
        await this.actor.loseResource(resourceId);
      }
    }
  }

  static async #onAddCharacter(event, target) {
    event.preventDefault();
    const nameInput = this.element.querySelector('input[name="new-character-name"]');
    const typeSelect = this.element.querySelector('select[name="new-character-type"]');
    const descInput = this.element.querySelector('input[name="new-character-desc"]');

    if (nameInput && nameInput.value.trim()) {
      const type = typeSelect ? typeSelect.value : 'mortal';
      const description = descInput ? descInput.value : '';
      await this.actor.addCharacter(nameInput.value.trim(), type, description);
      nameInput.value = '';
      if (descInput) descInput.value = '';
    }
  }

  static async #onKillCharacter(event, target) {
    event.preventDefault();
    const characterId = target.dataset.characterId;
    if (characterId) {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Kill Character" },
        content: "<p>Are you sure this character should die?</p>"
      });
      if (confirmed) {
        await this.actor.killCharacter(characterId);
      }
    }
  }

  static async #onAddMark(event, target) {
    event.preventDefault();
    const input = this.element.querySelector('input[name="new-mark"]');
    if (input && input.value.trim()) {
      await this.actor.addMark(input.value.trim());
      input.value = '';
    }
  }

  static async #onRemoveMark(event, target) {
    event.preventDefault();
    const markId = target.dataset.markId;
    if (markId) {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Remove Mark" },
        content: "<p>Are you sure you want to remove this mark?</p>"
      });
      if (confirmed) {
        await this.actor.removeMark(markId);
      }
    }
  }

  static async #onStrikeOutMemory(event, target) {
    event.preventDefault();
    const memoryIndex = parseInt(target.dataset.memoryIndex);
    if (!isNaN(memoryIndex)) {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Strike Out Memory" },
        content: "<p>Are you sure you want to forget this memory? This cannot be undone.</p>"
      });
      if (confirmed) {
        await this.actor.strikeOutMemory(memoryIndex);
      }
    }
  }

  static async #onMoveMemoryToDiary(event, target) {
    event.preventDefault();
    const memoryIndex = parseInt(target.dataset.memoryIndex);
    if (!isNaN(memoryIndex)) {
      // Check if diary exists
      if (!this.actor.system.diary.exists) {
        ui.notifications.warn("You must create a Diary first.");
        return;
      }
      await this.actor.moveMemoryToDiary(memoryIndex);
    }
  }

  static async #onPublishMemory(event, target) {
    event.preventDefault();
    const memoryIndex = parseInt(target.dataset.memoryIndex);
    if (!isNaN(memoryIndex)) {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Publish Memory" },
        content: "<p>Publishing this memory will make it permanent - it can never be lost or changed, and it will no longer take up a memory slot. This is typically done through Prompt 33b. Are you sure?</p>"
      });
      if (confirmed) {
        await this.actor.publishMemory(memoryIndex);
      }
    }
  }

  static async #onAddMemorySlot(event, target) {
    event.preventDefault();
    const input = this.element.querySelector('input[name="new-memory-theme"]');
    const theme = input ? input.value.trim() : '';
    await this.actor.addMemorySlot(theme);
    if (input) input.value = '';
  }

  static async #onLoseMemorySlot(event, target) {
    event.preventDefault();
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Lose Memory Slot" },
      content: "<p>Are you sure you want to permanently lose a memory slot? This cannot be undone.</p>"
    });
    if (confirmed) {
      await this.actor.loseMemorySlot();
    }
  }

  static async #onCreateDiary(event, target) {
    event.preventDefault();
    const input = this.element.querySelector('input[name="diary-description"]');
    const description = input ? input.value.trim() : "A leather-bound journal";
    await this.actor.createDiary(description);
    if (input) input.value = '';
  }

  static async #onAddJournalEntry(event, target) {
    event.preventDefault();
    const textarea = this.element.querySelector('textarea[name="new-journal-entry"]');
    if (textarea && textarea.value.trim()) {
      const currentPrompt = this.actor.system.prompts.current;
      const visitCount = this.actor.system.prompts.visitCounts[currentPrompt] || 1;
      const entry = visitCount === 1 ? 'a' : (visitCount === 2 ? 'b' : 'c');

      await this.actor.addJournalEntry(currentPrompt, entry, textarea.value.trim());
      textarea.value = '';
    }
  }

  static async #onEndGame(event, target) {
    event.preventDefault();
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "End Game" },
      content: "<p>Are you sure you want to end this vampire's story?</p>"
    });
    if (confirmed) {
      await this.actor.endGame();
    }
  }

  static async #onEditImage(event, target) {
    event.preventDefault();
    const fp = new FilePicker({
      type: "image",
      current: this.actor.img,
      callback: async (path) => {
        await this.actor.update({ img: path });
      }
    });
    fp.render(true);
  }

  static async #onLaunchWizard(event, target) {
    event.preventDefault();
    if (game.tyov?.launchCharacterWizard) {
      game.tyov.launchCharacterWizard(this.actor);
    } else {
      ui.notifications.error("Character creation wizard not available.");
    }
  }
}
