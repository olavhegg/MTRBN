import { setupIntuneHandlers } from './intuneHandlers';
import { setupAccountHandlers } from './accountHandlers';
import { setupGroupHandlers } from './groupHandlers';

export function setupAllHandlers() {
  setupIntuneHandlers();
  setupAccountHandlers();
  setupGroupHandlers();
} 