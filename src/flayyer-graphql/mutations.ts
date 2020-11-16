import { gql } from "graphql-request";

export const createDeck = gql`
  mutation createDeck($input: APICreateDeckInput!) {
    createDeck: API_createDeck(input: $input) {
      uploadUrl
      uploadFields {
        key
        value
      }
      deck {
        slug
        version
        engine
        tenant {
          slug
        }
        templates {
          edges {
            node {
              slug
            }
          }
        }
      }
    }
  }
`;
