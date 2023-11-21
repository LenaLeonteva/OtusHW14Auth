import {Entity, model, property} from '@loopback/repository';

/**
 * The model class is generated from OpenAPI schema - User
 * User
 */
@model({name: 'Users'})
export class Users extends Entity {
  constructor(data?: Partial<Users>) {
    super(data);
    if (data != null && typeof data === 'object') {
      Object.assign(this, data);
    }
  }

  /**
   *
   */
  @property({

    id: true,
    generated: true,
    type: 'string'

  })
  id?: string;

  /**
   *
   */
  @property({

    type: 'string',
    maxLength: 256,

  })
  username?: string;

  /**
   *
   */
  @property({

    type: 'string',

  })
  firstName?: string;

  /**
   *
   */
  @property({

    type: 'string',

  })
  lastName?: string;

  /**
   *
   */
  @property({

    type: 'string',
    format: 'email',

  })
  email?: string;

  /**
   *
   */
  @property({

    type: 'string',

  })
  phone?: string;

}

export interface UsersRelations {
  // describe navigational properties here
}

export type UsersWithRelations = Users & UsersRelations;


