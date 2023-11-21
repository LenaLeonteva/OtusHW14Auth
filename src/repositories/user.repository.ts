import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {UsersDataSource} from '../datasources';
//import {User, UserRelations} from '../models';
import {Users, UsersRelations} from '../models/users.model';

export class UsersRepository extends DefaultCrudRepository<
  Users,
  typeof Users.prototype.id,
  UsersRelations
> {
  constructor(
    @inject('datasources.users') dataSource: UsersDataSource,
  ) {
    super(Users, dataSource);
  }
}
