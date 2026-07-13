export const WORKFLOW_AGENT_PROFILE_IDS = {
  general: "agent-profile-codex",
  implementation: "agent-profile-implementation",
  planning: "agent-profile-planning",
  review: "agent-profile-review",
} as const;

export const WORKFLOW_AGENT_PROFILES = [
  { id: WORKFLOW_AGENT_PROFILE_IDS.general, label: "Codex · general implementation" },
  { id: WORKFLOW_AGENT_PROFILE_IDS.implementation, label: "Codex · implementation" },
  { id: WORKFLOW_AGENT_PROFILE_IDS.planning, label: "Codex · planning" },
  { id: WORKFLOW_AGENT_PROFILE_IDS.review, label: "Codex · review" },
] as const;

export const WORKFLOW_AGENT_PROFILE_ID_LIST = WORKFLOW_AGENT_PROFILES.map(({ id }) => id);

export const DEFAULT_WORKFLOW_AGENT_PROFILE_ID = WORKFLOW_AGENT_PROFILE_IDS.general;
