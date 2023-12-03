// Copyright IBM Corp. and LoopBack contributors 2020. All Rights Reserved.
// Node module: @loopback/example-todo-jwt
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {authenticate, TokenService} from '@loopback/authentication';
import {
  Credentials,
  MyUserService,
  TokenServiceBindings,
  User,
  UserRepository,
  UserServiceBindings,
} from '@loopback/authentication-jwt';
import {inject} from '@loopback/core';
import {model, property, repository} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  post,
  Request,
  requestBody,
  Response,
  RestBindings,
  SchemaObject
} from '@loopback/rest';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {genSalt, hash} from 'bcryptjs';
import {parse} from 'cookie';
import _ from 'lodash';
import {v4 as uuidv4} from 'uuid';
import {Users} from '../models/users.model';
import {UsersRepository} from '../repositories';

let SESSIONS = new Map();

@model()
export class NewUserRequest extends User {
  @property({
    type: 'string',
    required: true,
  })
  password: string;
}

const CredentialsSchema: SchemaObject = {
  type: 'object',
  required: ['username', 'password'],
  properties: {
    username: {
      type: 'string',
    },
    password: {
      type: 'string',
      minLength: 8,
    },
  },
};

export const CredentialsRequestBody = {
  description: 'The input of login function',
  required: true,
  content: {
    'application/json': {schema: CredentialsSchema},
  },
};

export class UserController {
  constructor(
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: MyUserService,
    @inject(SecurityBindings.USER, {optional: true})
    public user: UserProfile,
    @repository(UserRepository) protected userRepository: UserRepository,
    @repository(UsersRepository) public dataUserRepo: UsersRepository,
    @inject(RestBindings.Http.RESPONSE) private response: Response,
    @inject(RestBindings.Http.REQUEST) private request: Request
  ) { }

  @post('/login', {
    responses: {
      '200': {
        description: 'Session',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                sessionID: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  })
  async login(
    @requestBody(CredentialsRequestBody) credentials: Credentials,
  ): Promise<any> {
    // ensure the user exists, and the password is correct
    const user = await this.userService.verifyCredentials(credentials);

    // convert a User object into a UserProfile object (reduced set of properties)
    //const userProfile = this.userService.convertToUserProfile(user);
    // create a JSON Web Token based on the user profile
    //const token = await this.jwtService.generateToken(userProfile);

    const filter = {
      where: {
        username: user.username,
      }
    };
    let userID = await this.dataUserRepo.findOne(filter);
    if (!userID) return this.response.status(401).send(this.errorRes(401, "The user doesn't exist"))

    let sessionID = uuidv4();
    let userInfo = {
      userID: userID.id,
      userName: userID.username,
      email: userID.email

    }
    SESSIONS.set(sessionID, userInfo);
    this.response.set('X-UserId', userID.id);
    this.response.set('X-User', userID.username);
    this.response.set('X-Email', userID.email);
    this.response.cookie("session_id", sessionID)
    return;
  };

  @post('/auth', {
    responses: {
      '200': {
        description: 'Session',
      },
    },
  })
  async auth(): Promise<any> {
    let cookies = this.request.get("Set-cookie")
    if (!cookies) return this.response.status(403).send(this.errorRes(403, "Please go to login and provide Login/Password"))
    let objCookies = parse(cookies[0])
    let sessionID = objCookies.session_id
    if (!SESSIONS.has(sessionID)) return this.response.status(403).send(this.errorRes(403, "Please go to login and provide Login/Password"))
    let userData = SESSIONS.get(sessionID);

    const filter = {
      where: {
        username: userData.userName,
      }
    };
    let userID = await this.dataUserRepo.findOne(filter);
    if (!userID) return this.response.status(401).send(this.errorRes(401, "The user doesn't exist"))
    this.response.set('X-UserId', userID?.id);
    this.response.set('X-User', userID?.username);
    this.response.set('X-Email', userID?.email);
    return this.response.status(200).send();
  }

  @post('/logout', {
    responses: {
      '200': {
        description: 'Session',
      },
    },
  })
  async logout(): Promise<any> {
    let cookies = this.request.get("Set-cookie")
    if (!cookies) return this.response.status(200).send();
    let objCookies = parse(cookies[0])
    let sessionID = objCookies.session_id
    if (!SESSIONS.has(sessionID)) return this.response.status(200).send();
    SESSIONS.delete(sessionID);
    return this.response.status(200).send();
  }

  @get('/signin', {
    responses: {
      default: {
        description: 'Please go to login and provide Login/Password',
      },
    }
  })
  async signin(
  ): Promise<any> {
    return {message: 'Please go to login and provide Login/Password'}
  }

  @authenticate('jwt')
  @get('/whoAmI', {
    responses: {
      '200': {
        description: 'Return current user',
        content: {
          'application/json': {
            schema: {
              type: 'string',
            },
          },
        },
      },
    },
  })
  async whoAmI(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<string> {
    return currentUserProfile[securityId];
  }

  @post('/signup', {
    responses: {
      '200': {
        description: 'User',
        content: {
          'application/json': {
            schema: {
              'x-ts-type': User,
            },
          },
        },
      },
    },
  })
  async signUp(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(NewUserRequest, {
            title: 'NewUser',
          }),
        },
      },
    })
    newUserRequest: NewUserRequest,
  ): Promise<User | any> {
    const filter = {
      where: {
        username: newUserRequest.username,
      }
    };

    const sameName = await this.dataUserRepo.findOne(filter)
    if (sameName) {
      return this.response.status(400).send(this.errorRes(400, 'Это имя пользователя уже занято!'))
    }

    const password = await hash(newUserRequest.password, await genSalt());
    const savedUser = await this.userRepository.create(
      _.omit(newUserRequest, 'password'),
    );

    await this.userRepository.userCredentials(savedUser.id).create({password});

    let dataUser = new Users();
    dataUser.email = newUserRequest.email;
    dataUser.username = newUserRequest.username;
    dataUser.firstName = "";
    dataUser.lastName = "";
    dataUser.phone = "";
    await this.dataUserRepo.create(dataUser);

    return savedUser;
  }

  errorRes(code: number, mes: string): any {
    return {
      statusCode: code,
      code: "error",
      message: mes
    }
  }
}

