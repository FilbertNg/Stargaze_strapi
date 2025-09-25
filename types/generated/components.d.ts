import type { Schema, Struct } from '@strapi/strapi';

export interface ListOfDetailsCollaborator extends Struct.ComponentSchema {
  collectionName: 'components_list_of_details_collaborators';
  info: {
    displayName: 'collaborator';
  };
  attributes: {
    name: Schema.Attribute.String;
    type: Schema.Attribute.Enumeration<
      ['researcher', 'company', 'institution', 'agency']
    >;
  };
}

export interface ListOfDetailsFunding extends Struct.ComponentSchema {
  collectionName: 'components_list_of_details_fundings';
  info: {
    displayName: 'funding';
  };
  attributes: {
    source: Schema.Attribute.String;
    total_funding: Schema.Attribute.BigInteger;
  };
}

export interface ListOfDetailsPerson extends Struct.ComponentSchema {
  collectionName: 'components_list_of_details_people';
  info: {
    displayName: 'person';
  };
  attributes: {
    person_name: Schema.Attribute.String;
    person_title: Schema.Attribute.String;
  };
}

export interface ListOfDetailsProjectOutput extends Struct.ComponentSchema {
  collectionName: 'components_list_of_details_project_outputs';
  info: {
    displayName: 'project_output';
  };
  attributes: {
    citation: Schema.Attribute.Text;
    patent: Schema.Attribute.String & Schema.Attribute.DefaultTo<'none'>;
    project_title: Schema.Attribute.String;
  };
}

export interface ListOfDetailsText extends Struct.ComponentSchema {
  collectionName: 'components_list_of_details_texts';
  info: {
    displayName: 'text';
  };
  attributes: {
    text: Schema.Attribute.Text & Schema.Attribute.Required;
    text_type: Schema.Attribute.Enumeration<
      ['Heading', 'Subheading', 'Paragraph']
    > &
      Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'list-of-details.collaborator': ListOfDetailsCollaborator;
      'list-of-details.funding': ListOfDetailsFunding;
      'list-of-details.person': ListOfDetailsPerson;
      'list-of-details.project-output': ListOfDetailsProjectOutput;
      'list-of-details.text': ListOfDetailsText;
    }
  }
}
