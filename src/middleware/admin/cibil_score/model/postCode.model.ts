export class PostCodeModel {
  name: string = '';
  circle: string = '';
  district: string = '';
  division: string = '';
  region: string = '';
  state: string = '';
  pincode: string = '';

  json(data) {
    try {
      const model = new PostCodeModel();
      model.name = (data?.Name ?? '').toLocaleLowerCase();
      model.circle = (data?.Circle ?? '').toLocaleLowerCase();
      model.district = (data?.District ?? '').toLocaleLowerCase();
      model.division = (data?.Division ?? '').toLocaleLowerCase();
      model.region = (data?.Region ?? '').toLocaleLowerCase();
      model.state = (data?.State ?? '').toLocaleLowerCase();
      model.pincode = (data?.Pincode ?? '').toLocaleLowerCase();
      return model;
    } catch (error) {}
  }
}
