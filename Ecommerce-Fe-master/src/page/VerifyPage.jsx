import React, { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import Field from "../components/field/Field";
import Input from "../components/input/Input";
import Label from "../components/label/Label";
import AuthenticationPage from "./AuthenticationPage";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import Button from "../components/button/Button";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { changeState, verify } from "../redux/auth/userSlice";
import { useDispatch } from "react-redux";
import { unwrapResult } from "@reduxjs/toolkit";

const schema = yup.object({
  verify: yup
    .string()
    .required("Vui lòng nhập mã xác nhận")
    .min(6, "Mã xác nhận tối thiểu 6 ký tự"),
});

const VerifyPage = () => {
  const {
    control,
    handleSubmit,
    formState: { isValid, errors, isSubmitting },
    reset,
  } = useForm({
    mode: "onChange",
    defaultValues: { verify: "" },
    resolver: yupResolver(schema),
  });

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const dem = useRef(0);

  const handleBackToSignUp = () => {
    const signupValues = location.state?.signupValues || null;

    // Xóa trạng thái user đang chờ xác thực.
    // Nếu không xóa, SignUpPage sẽ tự đẩy lại sang /verify.
    localStorage.removeItem("jwt");
    localStorage.removeItem("user");

    navigate("/sign-up", {
      replace: true,
      state: {
        signupValues,
      },
    });
  };

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    const user = localStorage.getItem("user")
      ? JSON.parse(localStorage.getItem("user"))
      : null;

    const jwt = localStorage.getItem("jwt");

    if (!user && !jwt) {
      return navigate("/sign-up");
    }

    if (user?.active === "active") {
      toast.dismiss();
      toast.success("Chào mừng bạn đến với N19.VN", {
        pauseOnHover: false,
      });
      return navigate("/");
    }
  }, [navigate]);

  const handleVerify = async (values) => {
    if (!isValid) return;

    const data = {
      encode: values.verify,
    };

    try {
      const action = verify(data);
      const resultAction = await dispatch(action);
      unwrapResult(resultAction);

      toast.dismiss();
      toast.success("Chào mừng bạn đến với N19.VN", {
        pauseOnHover: false,
      });

      navigate("/");

      reset({
        verify: "",
      });
    } catch (error) {
      dem.current = dem.current + 1;

      if (dem.current >= 3) {
        const data = {
          state: "ban",
        };

        toast.dismiss();
        toast.warning("Bạn nhập sai mã xác nhận 3 lần", {
          pauseOnHover: false,
        });

        const user = localStorage.getItem("user")
          ? JSON.parse(localStorage.getItem("user"))
          : null;

        if (user?.active === "verify") {
          const action = changeState(data);
          await dispatch(action);

          localStorage.removeItem("jwt");
          localStorage.removeItem("user");

          navigate("/sign-up");
          dem.current = 0;
        }
      } else {
        toast.dismiss();
        toast.error(error.message, {
          pauseOnHover: false,
        });
      }
    }
  };

  return (
    <AuthenticationPage>
      <form
        onSubmit={handleSubmit(handleVerify)}
        autoComplete="off"
        className="pb-3"
      >
        <Field>
          <Label htmlFor="verify">Mã xác nhận</Label>
          <Input
            name="verify"
            type="text"
            placeholder="Mời bạn nhập mã xác nhận"
            control={control}
          />
          {errors.verify && (
            <p className="text-red-500 text-base font-medium">
              {errors.verify?.message}
            </p>
          )}
        </Field>

        <Button
          type="submit"
          isLoading={isSubmitting}
          disable={isSubmitting}
          style={{
            width: "100%",
            maxWidth: 250,
            height: "50px",
            margin: "30px auto 12px auto",
          }}
        >
          Xác nhận
        </Button>

        <div className="flex justify-center pb-8">
          <button
            type="button"
            onClick={handleBackToSignUp}
            className="text-base font-medium text-gray-600 hover:text-[#1DC071] hover:underline"
          >
            Quay lại
          </button>
        </div>
      </form>
    </AuthenticationPage>
  );
};

export default VerifyPage;