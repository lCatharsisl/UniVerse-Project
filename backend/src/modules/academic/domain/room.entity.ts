export interface RoomProps {
  id?: number;
  code: string;
  floorId: number;
  capacity?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Room {
  private constructor(private props: RoomProps) {}

  public static create(props: RoomProps): Room {
    return new Room(props);
  }

  get id() { return this.props.id; }
  get code() { return this.props.code; }
  get floorId() { return this.props.floorId; }
  get capacity() { return this.props.capacity; }

  public toJSON() {
    return { ...this.props };
  }
}
