/**
 * ============================================================================
 * THOUSAND YEAR OLD VAMPIRE - Main Entry Point
 * ============================================================================
 *
 * A solo journaling RPG system for Foundry VTT based on the game by Tim Hutchings.
 * Chronicle the unlife of a vampire over many centuries.
 */

import { TYOVActor } from "./documents/actor.mjs";
import { VampireSheet } from "./sheets/vampire-sheet.mjs";
import { TYOV_CONFIG } from "./helpers/config.mjs";

// ============================================================================
// INITIALIZATION HOOK
// ============================================================================
Hooks.once("init", async function() {
  console.log("Thousand Year Old Vampire | Initializing the TYOV Game System");

  // Store references on global game object
  game.tyov = {
    TYOVActor,

    // Helper to post a prompt to chat
    postPrompt: async (promptNumber, entry = 'a') => {
      const prompt = CONFIG.TYOV.prompts[promptNumber];
      if (!prompt) {
        ui.notifications.warn(`Unknown prompt: ${promptNumber}`);
        return;
      }

      const entryText = prompt[entry];
      if (!entryText) {
        ui.notifications.warn(`No entry '${entry}' for prompt ${promptNumber}`);
        return;
      }

      const messageContent = `
        <div class="tyov-prompt-message">
          <h2>Prompt ${promptNumber}${entry}</h2>
          <p>${entryText}</p>
        </div>
      `;

      await ChatMessage.create({ content: messageContent });
    }
  };

  // Store system configuration
  CONFIG.TYOV = TYOV_CONFIG;

  // Register custom document class
  CONFIG.Actor.documentClass = TYOVActor;

  // Register actor sheet
  Actors.registerSheet("tyov", VampireSheet, {
    types: ["vampire"],
    makeDefault: true,
    label: "TYOV.SheetLabels.Vampire"
  });

  // Preload templates
  return preloadHandlebarsTemplates();
});

// ============================================================================
// TEMPLATE PRELOADING
// ============================================================================
async function preloadHandlebarsTemplates() {
  const templatePaths = [
    "systems/tyov/templates/actor/vampire-sheet.hbs"
  ];
  return loadTemplates(templatePaths);
}

// ============================================================================
// HANDLEBARS HELPERS
// ============================================================================
Hooks.once("init", function() {
  // Equality helper
  Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
  });

  // Not equal helper
  Handlebars.registerHelper('neq', function(a, b) {
    return a !== b;
  });

  // Array includes helper
  Handlebars.registerHelper('includes', function(arr, val) {
    return arr && arr.includes(val);
  });

  // Math helper
  Handlebars.registerHelper('math', function(a, operator, b) {
    a = parseFloat(a);
    b = parseFloat(b);
    switch (operator) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return a / b;
      default: return a;
    }
  });

  // Get prompt text
  Handlebars.registerHelper('getPrompt', function(number, entry) {
    const prompt = CONFIG.TYOV.prompts[number];
    if (!prompt) return "Unknown prompt";
    return prompt[entry] || prompt.a || "No entry found";
  });

  // Check if experience slot has content
  Handlebars.registerHelper('hasContent', function(str) {
    return str && str.trim().length > 0;
  });

  // Count non-empty experiences in a memory
  Handlebars.registerHelper('countExperiences', function(experiences) {
    if (!experiences) return 0;
    return experiences.filter(e => e && e.trim().length > 0).length;
  });
});

// ============================================================================
// READY HOOK
// ============================================================================
Hooks.once("ready", async function() {
  console.log("Thousand Year Old Vampire | System Ready");
  console.log("Thousand Year Old Vampire | Useful commands:");
  console.log("  game.tyov.postPrompt(1, 'a') - Post prompt 1a to chat");
});
