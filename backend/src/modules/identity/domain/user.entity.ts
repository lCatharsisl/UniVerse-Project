export type UserRole = 'student' | 'staff' | 'admin' | 'community';

export interface UserProps {
  id?: number;
  email: string;
  passwordHash: string;
  role: UserRole;
  isEmailVerified: boolean;
  isActive: boolean;
  profileImageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User {
  private constructor(private props: UserProps) {}

  public static create(props: UserProps): User {
    return new User(props);
  }

  get id() { return this.props.id; }
  get email() { return this.props.email; }
  get role() { return this.props.role; }
  get isEmailVerified() { return this.props.isEmailVerified; }
  get isActive() { return this.props.isActive; }
  get passwordHash() { return this.props.passwordHash; }

  // Business logic methods
  public verifyEmail() {
    this.props.isEmailVerified = true;
    this.props.updatedAt = new Date();
  }

  public deactivate() {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return { ...this.props };
  }
}
