import type { Schema, Struct } from '@strapi/strapi';

export interface ListOfDetailsCollaborator extends Struct.ComponentSchema {
  collectionName: 'components_list_of_details_collaborators';
  info: {
    displayName: 'collaborator';
  };
  attributes: {
    logo: Schema.Attribute.Media<'images'>;
    name: Schema.Attribute.String;
    type: Schema.Attribute.Enumeration<
      ['researcher', 'company', 'institution', 'agency']
    >;
  };
}

export interface ListOfDetailsContent extends Struct.ComponentSchema {
  collectionName: 'components_list_of_details_contents';
  info: {
    displayName: 'media';
  };
  attributes: {
    Media: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
  };
}

export interface ListOfDetailsOnlyText extends Struct.ComponentSchema {
  collectionName: 'components_list_of_details_only_texts';
  info: {
    displayName: 'long-text';
  };
  attributes: {
    text: Schema.Attribute.Text;
  };
}

export interface ListOfDetailsPerson extends Struct.ComponentSchema {
  collectionName: 'components_list_of_details_people';
  info: {
    displayName: 'person';
  };
  attributes: {
    person: Schema.Attribute.String;
  };
}

export interface ListOfDetailsProjectOutput extends Struct.ComponentSchema {
  collectionName: 'components_list_of_details_project_outputs';
  info: {
    displayName: 'project_output';
  };
  attributes: {
    master: Schema.Attribute.Integer;
    paper_citation: Schema.Attribute.Component<
      'list-of-details.only-text',
      true
    >;
    patent_citation: Schema.Attribute.Component<
      'list-of-details.only-text',
      true
    >;
    phd: Schema.Attribute.Integer;
  };
}

export interface ListOfDetailsText extends Struct.ComponentSchema {
  collectionName: 'components_list_of_details_texts';
  info: {
    displayName: 'text';
  };
  attributes: {
    Text: Schema.Attribute.RichText;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'list-of-details.collaborator': ListOfDetailsCollaborator;
      'list-of-details.content': ListOfDetailsContent;
      'list-of-details.only-text': ListOfDetailsOnlyText;
      'list-of-details.person': ListOfDetailsPerson;
      'list-of-details.project-output': ListOfDetailsProjectOutput;
      'list-of-details.text': ListOfDetailsText;
    }
  }
}
