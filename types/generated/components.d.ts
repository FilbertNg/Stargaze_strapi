import type { Schema, Struct } from '@strapi/strapi';

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
    person: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ListOfDetailsProjectOutput extends Struct.ComponentSchema {
  collectionName: 'components_list_of_details_project_outputs';
  info: {
    displayName: 'project_output';
  };
  attributes: {
    master: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    paper_citation: Schema.Attribute.Component<
      'list-of-details.only-text',
      true
    >;
    patent_citation: Schema.Attribute.Component<
      'list-of-details.only-text',
      true
    >;
    phd: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
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
      'list-of-details.content': ListOfDetailsContent;
      'list-of-details.only-text': ListOfDetailsOnlyText;
      'list-of-details.person': ListOfDetailsPerson;
      'list-of-details.project-output': ListOfDetailsProjectOutput;
      'list-of-details.text': ListOfDetailsText;
    }
  }
}
