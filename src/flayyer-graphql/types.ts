/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL mutation operation: createDeck
// ====================================================

export interface createDeck_createDeck_uploadFields {
  key: string;
  value: string;
}

export interface createDeck_createDeck_deck_tenant {
  slug: string;
}

export interface createDeck_createDeck_deck_templates_edges_node {
  slug: string;
}

export interface createDeck_createDeck_deck_templates_edges {
  node: createDeck_createDeck_deck_templates_edges_node;
}

export interface createDeck_createDeck_deck_templates {
  edges: createDeck_createDeck_deck_templates_edges[];
}

export interface createDeck_createDeck_deck {
  slug: string;
  version: number;
  engine: string | null;
  tenant: createDeck_createDeck_deck_tenant;
  templates: createDeck_createDeck_deck_templates;
}

export interface createDeck_createDeck {
  uploadUrl: string;
  uploadFields: createDeck_createDeck_uploadFields[];
  deck: createDeck_createDeck_deck;
}

export interface createDeck {
  createDeck: createDeck_createDeck;
}

export interface createDeckVariables {
  input: APICreateDeckInput;
}

/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

//==============================================================
// START Enums and Input Objects
//==============================================================

export interface APICreateDeckInput {
  slug: string;
  engine?: string | null;
  name?: string | null;
  description?: string | null;
  templates: APICreateDeckInputTemplate[];
}

export interface APICreateDeckInputTemplate {
  slug: string;
}

//==============================================================
// END Enums and Input Objects
//==============================================================
