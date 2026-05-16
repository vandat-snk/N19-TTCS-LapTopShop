import React, { useEffect, useState } from "react";
import DashboardHeading from "../dashboard/DashboardHeding";
import Button from "../../components/button/Button";
import Field from "../../components/field/Field";
import Label from "../../components/label/Label";
import Input from "../../components/input/Input";
import { useForm } from "react-hook-form";
import FieldCheckboxes from "../../components/field/FieldCheckboxes";
import Radio from "../../components/checkbox/Radio";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import ImageUpload from "../../components/images/ImageUpload";
import axios from "axios";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { getUser, updateInfoUser } from "../../redux/auth/userSlice";
import Skeleton from "../../components/skeleton/Skeleton";
import { useNavigate } from "react-router-dom";

const schema = yup.object({
  fullname: yup
    .string()
    .required("Vui lòng nhập họ tên")
    .min(3, "Tối thiểu phải có 3 ký tự")
    .max(30, "Vượt quá 30 ký tự cho phép"),
  sdt: yup
    .string()
    .required("Vui lòng nhập số điện thoại")
    .matches(/(84|0[3|5|7|8|9])+([0-9]{8})\b/, {
      message: "Định dạng số điện thoại không đúng",
    }),
  dateOfBirth: yup.string().required("Vui lòng chọn ngày sinh").nullable(),
  gender: yup.string().oneOf(["nam", "nữ", "khác"], "Vui lòng chọn giới tính"),
});

const Gender = { NAM: "nam", NU: "nữ", Diff: "khác" };

const UserAccount = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { current } = useSelector((state) => state.user); 

  const {
    control,
    watch,
    setValue,
    handleSubmit,
    getValues,
    formState: { isSubmitting, isValid, errors },
  } = useForm({
    mode: "onChange",
    resolver: yupResolver(schema),
    defaultValues: {
      fullname: current?.name || "",
      email: current?.email || "",
      sdt: current?.phone || "",
      dateOfBirth: current?.dateOfBirth || "",
      gender: current?.gender || Gender.NAM,
    },
  });

  const watchGender = watch("gender");
  const [image, setImage] = useState(current?.avatar || "");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!current) {
      toast.dismiss();
      toast.warning("Vui lòng đăng nhập");
      navigate("/sign-in");
    }
  }, [current, navigate]);

  useEffect(() => {
    dispatch(getUser());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [dispatch]);

  const handleSelectImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const urlImage = await handleUpLoadImage(file);
    setImage(urlImage);
  };

  const handleUpLoadImage = async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    const response = await axios({
      method: "post",
      data: formData,
      headers: { "Content-Type": "multipart/form-data" },
      url: "https://api.imgbb.com/1/upload?key=faf46b849aaf25c8587aec2835f05b26",
      onUploadProgress: (data) => setProgress(Math.round((100 * data.loaded) / data.total)),
    });
    return response.data.data.url;
  };

  const handleUpdate = async (values) => { 
    if (!isValid) return;
    const cloneValues = {
      name: values.fullname,
      phone: values.sdt,
      gender: getValues("gender"),
      dateOfBirth: getValues("dateOfBirth"),
      avatar: image,
    };
    
    try {
      await dispatch(updateInfoUser(cloneValues)).unwrap(); 
      
      toast.dismiss();
      toast.success("Cập nhật thông tin thành công");
    } catch (error) {
      toast.dismiss();
      toast.error(error.message || "Cập nhật thất bại. Vui lòng kiểm tra lại API!"); 
      console.log("Lỗi thật sự từ Backend:", error);
    }
  };

  const handleDeleteImage = () => {
    setImage("");
    setProgress(0);
  };

  if (!current) return (
    <div className="pb-16 bg-white p-5 rounded-lg">
        <Skeleton className="w-36 h-36 rounded-full mx-auto" />
        <Skeleton className="w-full h-10 mt-5" />
    </div>
  );

  return (
    <div className="bg-white rounded-lg pb-16">
      <DashboardHeading title="Thông tin tài khoản" className="px-5 py-5" />
      
      <form className="px-5" onSubmit={handleSubmit(handleUpdate)}>
        <Field>
          <Label>Ảnh đại diện</Label>
          <ImageUpload
            onChange={handleSelectImage}
            className="mx-auto"
            progress={progress}
            image={image}
            handleDeleteImage={handleDeleteImage}
          />
        </Field>

        <Field>
          <Label htmlFor="fullname">Họ tên</Label>
          <Input name="fullname" control={control} type="text" />
          {errors.fullname && <p className="text-red-500 text-sm">{errors.fullname?.message}</p>}
        </Field>

        <Field>
          <Label htmlFor="email">Email</Label>
          <Input name="email" control={control} disabled className="bg-gray-100" />
        </Field>

        <Field>
          <Label htmlFor="sdt">Số điện thoại</Label>
          <Input name="sdt" type="number" control={control} />
          {errors.sdt && <p className="text-red-500 text-sm">{errors.sdt?.message}</p>}
        </Field>

        <Field>
          <Label htmlFor="dateOfBirth">Ngày sinh</Label>
          <Input name="dateOfBirth" type="date" control={control} />
          {errors.dateOfBirth && <p className="text-red-500 text-sm">{errors.dateOfBirth?.message}</p>}
        </Field>

        <Field>
          <FieldCheckboxes>
            <Label htmlFor="gender">Giới tính</Label>
            <Radio name="gender" control={control} checked={watchGender === Gender.NAM} onChange={() => setValue("gender", Gender.NAM)}>
              Nam
            </Radio>
            <Radio name="gender" control={control} checked={watchGender === Gender.NU} onChange={() => setValue("gender", Gender.NU)}>
              Nữ
            </Radio>
            <Radio name="gender" control={control} checked={watchGender === Gender.Diff} onChange={() => setValue("gender", Gender.Diff)}>
              Khác
            </Radio>
          </FieldCheckboxes>
          {errors.gender && <p className="text-red-500 text-sm">{errors.gender?.message}</p>}
        </Field>

        <Button
          kind="primary"
          className="mx-auto w-[200px] mt-10"
          type="submit"
          disabled={isSubmitting}
          isLoading={isSubmitting}
          height="50px"
        >
          Cập nhật thông tin
        </Button>
      </form>
    </div>
  );
};

export default UserAccount;