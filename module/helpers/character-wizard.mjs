/**
 * ============================================================================
 * THOUSAND YEAR OLD VAMPIRE - Character Creation Wizard
 * ============================================================================
 *
 * A multi-step wizard for creating vampire characters according to the
 * game rules in the Thousand Year Old Vampire rulebook by Tim Hutchings.
 *
 * Character Creation Steps:
 * 1. Mortal Life - Name, origin, era, and first experience
 * 2. Mortal Relationships - Create at least 3 mortal characters
 * 3. Skills & Resources - 3 skills and 3 resources from mortal life
 * 4. More Memories - 3 experiences combining existing traits
 * 5. Transformation - Immortal creator, mark, and transformation experience
 */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CharacterCreationWizard extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id: "tyov-character-wizard",
    classes: ["tyov", "character-wizard"],
    tag: "form",
    window: {
      title: "Vampire Creation",
      icon: "fas fa-skull",
      resizable: true
    },
    position: {
      width: 700,
      height: "auto"
    },
    form: {
      handler: CharacterCreationWizard.#onFormSubmit,
      submitOnChange: false,
      closeOnSubmit: false
    },
    actions: {
      nextStep: CharacterCreationWizard.#onNextStep,
      prevStep: CharacterCreationWizard.#onPrevStep,
      addMortal: CharacterCreationWizard.#onAddMortal,
      removeMortal: CharacterCreationWizard.#onRemoveMortal,
      addSkill: CharacterCreationWizard.#onAddSkill,
      removeSkill: CharacterCreationWizard.#onRemoveSkill,
      addResource: CharacterCreationWizard.#onAddResource,
      removeResource: CharacterCreationWizard.#onRemoveResource,
      finishCreation: CharacterCreationWizard.#onFinishCreation
    }
  };

  static PARTS = {
    wizard: {
      template: "systems/tyov/templates/dialogs/character-creation-wizard.hbs"
    }
  };

  // Track the actor being created
  actor = null;

  // Current step (1-5)
  currentStep = 1;

  // Wizard data collected across steps
  wizardData = {
    // Step 1: Mortal Life
    mortalName: "",
    origin: "",
    era: "",
    firstExperience: "",

    // Step 2: Mortal Relationships (at least 3)
    mortals: [],

    // Step 3: Skills & Resources
    skills: [],
    resources: [],

    // Step 4: Three Experiences (one per memory slot 2, 3, 4)
    experience2: "",
    experience3: "",
    experience4: "",

    // Step 5: Transformation
    immortalName: "",
    immortalDescription: "",
    markDescription: "",
    transformationExperience: ""
  };

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  get title() {
    return `Vampire Creation - Step ${this.currentStep} of 5`;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.step = this.currentStep;
    context.data = this.wizardData;
    context.actor = this.actor;

    // Step-specific data
    context.isFirstStep = this.currentStep === 1;
    context.isLastStep = this.currentStep === 5;

    // Validation for current step
    context.canProceed = this._validateCurrentStep();

    // Step titles and descriptions
    context.stepInfo = this._getStepInfo();

    // For step 4, provide trait summaries for combining
    if (this.currentStep === 4) {
      context.existingTraits = {
        mortals: this.wizardData.mortals.map(m => m.name),
        skills: this.wizardData.skills.map(s => s.name),
        resources: this.wizardData.resources.map(r => r.name)
      };
    }

    return context;
  }

  _onRender(context, options) {
    super._onRender(context, options);

    // Add input listeners to dynamically update the Next/Finish button state
    const form = this.element;
    if (!form) return;

    const nextButton = form.querySelector('[data-action="nextStep"], [data-action="finishCreation"]');
    if (!nextButton) return;

    // Get all input fields that affect validation for the current step
    const inputFields = this._getValidationInputs(form);

    // Add input listeners to each field
    inputFields.forEach(input => {
      input.addEventListener('input', () => this._updateButtonState(nextButton));
    });

    // Initial button state update based on current form values
    this._updateButtonState(nextButton);
  }

  _getValidationInputs(form) {
    switch (this.currentStep) {
      case 1:
        return form.querySelectorAll('[name="mortalName"], [name="firstExperience"]');
      case 4:
        return form.querySelectorAll('[name="experience2"], [name="experience3"], [name="experience4"]');
      case 5:
        return form.querySelectorAll('[name="immortalName"], [name="markDescription"], [name="transformationExperience"]');
      default:
        return [];
    }
  }

  _updateButtonState(button) {
    const form = this.element;
    if (!form || !button) return;

    let isValid = false;

    switch (this.currentStep) {
      case 1: {
        const mortalName = form.querySelector('[name="mortalName"]')?.value?.trim() || "";
        const firstExperience = form.querySelector('[name="firstExperience"]')?.value?.trim() || "";
        isValid = mortalName.length > 0 && firstExperience.length > 0;
        break;
      }
      case 2:
        isValid = this.wizardData.mortals.length >= 3 &&
                  this.wizardData.mortals.every(m => m.name.trim().length > 0);
        break;
      case 3:
        isValid = this.wizardData.skills.length >= 3 &&
                  this.wizardData.resources.length >= 3;
        break;
      case 4: {
        const exp2 = form.querySelector('[name="experience2"]')?.value?.trim() || "";
        const exp3 = form.querySelector('[name="experience3"]')?.value?.trim() || "";
        const exp4 = form.querySelector('[name="experience4"]')?.value?.trim() || "";
        isValid = exp2.length > 0 && exp3.length > 0 && exp4.length > 0;
        break;
      }
      case 5: {
        const immortalName = form.querySelector('[name="immortalName"]')?.value?.trim() || "";
        const markDescription = form.querySelector('[name="markDescription"]')?.value?.trim() || "";
        const transformationExperience = form.querySelector('[name="transformationExperience"]')?.value?.trim() || "";
        isValid = immortalName.length > 0 && markDescription.length > 0 && transformationExperience.length > 0;
        break;
      }
    }

    button.disabled = !isValid;
  }

  _getStepInfo() {
    const steps = {
      1: {
        title: "Mortal Life",
        description: "Imagine a person in the distant past. This person will become your vampire. Who were they before death claimed them?",
        instruction: "Create an Experience that encapsulates their history: \"I am [name], [description of their life before vampirism].\""
      },
      2: {
        title: "Mortal Relationships",
        description: "Your vampire knew people in their mortal life. These characters will have relationships with your vampire - relatives, friends, lovers, enemies, mentors, or debtors.",
        instruction: "Create at least three mortal Characters. Know that these Characters can be very important, but will not be around for long."
      },
      3: {
        title: "Skills & Resources",
        description: "Your vampire-to-be has abilities and possessions from their mortal life.",
        instruction: "Give your vampire three Skills fitting for their lot in life, and three Resources they obtained while still mortal. Resources can be anything - an obsidian knife or a fleet of warships."
      },
      4: {
        title: "Formative Memories",
        description: "Your vampire has memories that shaped who they were. Each Experience should combine two of your existing traits (Characters, Skills, or Resources).",
        instruction: "Create three Experiences, each combining two traits. For example, if you have the Resource 'Longship' and Character 'Gundar', you might write about sailing together."
      },
      5: {
        title: "The Transformation",
        description: "Something cursed (or blessed) your character with unlife. Create the immortal who transformed you, the Mark that proves your undead nature, and describe how it happened.",
        instruction: "Create an Immortal (your creator), a Mark (visible sign of vampirism), and an Experience describing your transformation."
      }
    };
    return steps[this.currentStep];
  }

  _validateCurrentStep() {
    switch (this.currentStep) {
      case 1:
        return this.wizardData.mortalName.trim().length > 0 &&
               this.wizardData.firstExperience.trim().length > 0;
      case 2:
        return this.wizardData.mortals.length >= 3 &&
               this.wizardData.mortals.every(m => m.name.trim().length > 0);
      case 3:
        return this.wizardData.skills.length >= 3 &&
               this.wizardData.resources.length >= 3 &&
               this.wizardData.skills.every(s => s.name.trim().length > 0) &&
               this.wizardData.resources.every(r => r.name.trim().length > 0);
      case 4:
        return this.wizardData.experience2.trim().length > 0 &&
               this.wizardData.experience3.trim().length > 0 &&
               this.wizardData.experience4.trim().length > 0;
      case 5:
        return this.wizardData.immortalName.trim().length > 0 &&
               this.wizardData.markDescription.trim().length > 0 &&
               this.wizardData.transformationExperience.trim().length > 0;
      default:
        return false;
    }
  }

  _collectFormData() {
    const form = this.element;
    if (!form) return;

    switch (this.currentStep) {
      case 1:
        this.wizardData.mortalName = form.querySelector('[name="mortalName"]')?.value || "";
        this.wizardData.origin = form.querySelector('[name="origin"]')?.value || "";
        this.wizardData.era = form.querySelector('[name="era"]')?.value || "";
        this.wizardData.firstExperience = form.querySelector('[name="firstExperience"]')?.value || "";
        break;

      case 4:
        this.wizardData.experience2 = form.querySelector('[name="experience2"]')?.value || "";
        this.wizardData.experience3 = form.querySelector('[name="experience3"]')?.value || "";
        this.wizardData.experience4 = form.querySelector('[name="experience4"]')?.value || "";
        break;

      case 5:
        this.wizardData.immortalName = form.querySelector('[name="immortalName"]')?.value || "";
        this.wizardData.immortalDescription = form.querySelector('[name="immortalDescription"]')?.value || "";
        this.wizardData.markDescription = form.querySelector('[name="markDescription"]')?.value || "";
        this.wizardData.transformationExperience = form.querySelector('[name="transformationExperience"]')?.value || "";
        break;
    }
  }

  // ==========================================================================
  // ACTION HANDLERS
  // ==========================================================================

  static async #onFormSubmit(event, form, formData) {
    // Form submission is handled by individual action handlers
  }

  static async #onNextStep(event, target) {
    event.preventDefault();
    this._collectFormData();

    if (!this._validateCurrentStep()) {
      ui.notifications.warn("Please complete all required fields before continuing.");
      return;
    }

    if (this.currentStep < 5) {
      this.currentStep++;
      this.render();
    }
  }

  static async #onPrevStep(event, target) {
    event.preventDefault();
    this._collectFormData();

    if (this.currentStep > 1) {
      this.currentStep--;
      this.render();
    }
  }

  static async #onAddMortal(event, target) {
    event.preventDefault();
    const form = this.element;
    const nameInput = form.querySelector('[name="newMortalName"]');
    const descInput = form.querySelector('[name="newMortalDesc"]');

    const name = nameInput?.value?.trim() || "";
    const description = descInput?.value?.trim() || "";

    if (!name) {
      ui.notifications.warn("Please enter a name for the mortal character.");
      return;
    }

    this.wizardData.mortals.push({
      id: foundry.utils.randomID(),
      name: name,
      description: description
    });

    if (nameInput) nameInput.value = "";
    if (descInput) descInput.value = "";

    this.render();
  }

  static async #onRemoveMortal(event, target) {
    event.preventDefault();
    const mortalId = target.dataset.mortalId;
    this.wizardData.mortals = this.wizardData.mortals.filter(m => m.id !== mortalId);
    this.render();
  }

  static async #onAddSkill(event, target) {
    event.preventDefault();
    const form = this.element;
    const nameInput = form.querySelector('[name="newSkillName"]');

    const name = nameInput?.value?.trim() || "";

    if (!name) {
      ui.notifications.warn("Please enter a skill name.");
      return;
    }

    this.wizardData.skills.push({
      id: foundry.utils.randomID(),
      name: name
    });

    if (nameInput) nameInput.value = "";

    this.render();
  }

  static async #onRemoveSkill(event, target) {
    event.preventDefault();
    const skillId = target.dataset.skillId;
    this.wizardData.skills = this.wizardData.skills.filter(s => s.id !== skillId);
    this.render();
  }

  static async #onAddResource(event, target) {
    event.preventDefault();
    const form = this.element;
    const nameInput = form.querySelector('[name="newResourceName"]');
    const stationaryCheckbox = form.querySelector('[name="newResourceStationary"]');

    const name = nameInput?.value?.trim() || "";
    const stationary = stationaryCheckbox?.checked || false;

    if (!name) {
      ui.notifications.warn("Please enter a resource name.");
      return;
    }

    this.wizardData.resources.push({
      id: foundry.utils.randomID(),
      name: name,
      stationary: stationary
    });

    if (nameInput) nameInput.value = "";
    if (stationaryCheckbox) stationaryCheckbox.checked = false;

    this.render();
  }

  static async #onRemoveResource(event, target) {
    event.preventDefault();
    const resourceId = target.dataset.resourceId;
    this.wizardData.resources = this.wizardData.resources.filter(r => r.id !== resourceId);
    this.render();
  }

  static async #onFinishCreation(event, target) {
    event.preventDefault();
    this._collectFormData();

    if (!this._validateCurrentStep()) {
      ui.notifications.warn("Please complete all required fields before finishing.");
      return;
    }

    await this._applyWizardDataToActor();
    this.close();

    // Post a welcome message
    await ChatMessage.create({
      content: `
        <div class="tyov-creation-complete">
          <h2>A Vampire is Born</h2>
          <p><strong>${this.wizardData.mortalName}</strong> has been transformed into an immortal creature of the night.</p>
          <p><em>Your story begins at Prompt 1. Roll the dice to discover your fate...</em></p>
        </div>
      `
    });

    ui.notifications.info("Character creation complete! Your vampire's story awaits.");
  }

  async _applyWizardDataToActor() {
    const data = this.wizardData;

    // Build the update object
    const updateData = {
      "name": data.mortalName,
      "system.biography.name": data.mortalName,
      "system.biography.origin": data.origin || `${data.mortalName}'s origin`,
      "system.biography.era": data.era,
      "system.biography.currentName": data.mortalName,

      // Memory 1: First experience (mortal life)
      "system.memories.0.experiences.0": data.firstExperience,

      // Memory 2: Second experience (combining traits)
      "system.memories.1.experiences.0": data.experience2,

      // Memory 3: Third experience (combining traits)
      "system.memories.2.experiences.0": data.experience3,

      // Memory 4: Fourth experience (combining traits)
      "system.memories.3.experiences.0": data.experience4,

      // Memory 5: Transformation experience
      "system.memories.4.experiences.0": data.transformationExperience,

      // Skills (3 from mortal life)
      "system.skills": data.skills.map(s => ({
        id: foundry.utils.randomID(),
        name: s.name,
        checked: false,
        lost: false
      })),

      // Resources (3 from mortal life)
      "system.resources": data.resources.map(r => ({
        id: foundry.utils.randomID(),
        name: r.name,
        stationary: r.stationary || false,
        lost: false,
        isDiary: false
      })),

      // Characters (3+ mortals + 1 immortal creator)
      "system.characters": [
        // Mortals first
        ...data.mortals.map(m => ({
          id: foundry.utils.randomID(),
          name: m.name,
          type: "mortal",
          description: m.description || "",
          dead: false,
          relationship: ""
        })),
        // Immortal creator
        {
          id: foundry.utils.randomID(),
          name: data.immortalName,
          type: "immortal",
          description: data.immortalDescription || "The creature who cursed you with unlife",
          dead: false,
          relationship: "creator"
        }
      ],

      // Marks (1 from transformation)
      "system.marks": [{
        id: foundry.utils.randomID(),
        description: data.markDescription,
        removed: false
      }],

      // Reset prompts to start at 1
      "system.prompts.current": 1,
      "system.prompts.history": [],
      "system.prompts.visitCounts": {}
    };

    await this.actor.update(updateData);
  }
}

/**
 * Launch the character creation wizard for a new vampire actor
 * @param {Actor} actor - The actor to populate
 */
export async function launchCharacterWizard(actor) {
  const wizard = new CharacterCreationWizard(actor);
  wizard.render(true);
  return wizard;
}

/**
 * Check if an actor needs the character creation wizard
 * (i.e., has no skills, resources, characters, or experiences)
 * @param {Actor} actor - The actor to check
 * @returns {boolean}
 */
export function actorNeedsWizard(actor) {
  if (actor.type !== "vampire") return false;

  const system = actor.system;

  // Check if actor has any traits
  const hasSkills = system.skills && system.skills.length > 0;
  const hasResources = system.resources && system.resources.length > 0;
  const hasCharacters = system.characters && system.characters.length > 0;
  const hasMarks = system.marks && system.marks.length > 0;

  // Check if any memories have content
  const hasMemories = system.memories && system.memories.some(m =>
    m.experiences && m.experiences.some(e => e && e.trim().length > 0)
  );

  // Actor needs wizard if they have nothing
  return !hasSkills && !hasResources && !hasCharacters && !hasMarks && !hasMemories;
}
