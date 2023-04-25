import Head from "next/head"

import RootLayout from "@/layouts/root-layout"
import {
	Box,
	Button,
	Divider,
	Flex,
	FormControl,
	FormErrorMessage,
	FormLabel,
	Grid,
	GridItem,
	Heading,
	Input,
	Radio,
	RadioGroup,
	Skeleton,
	Stack,
	Text,
	Textarea,
	useToast,
	useDisclosure,
	HStack,
	Icon,
	Badge,
	Tooltip,
} from "@chakra-ui/react"
import { type GetServerSidePropsContext, type InferGetServerSidePropsType } from "next"
import ProfileLayout from "@/layouts/profile-layout"
import { CreatableSelect } from "chakra-react-select"
import { useState } from "react"
import { useForm, type SubmitHandler, Controller } from "react-hook-form"
import { api } from "@/utils/api"
import { zodResolver } from "@hookform/resolvers/zod"
import {
	type CandidateProfileSchema,
	candidateProfileSchema,
	candidateContactSchema,
	type CandidateContactSchema,
} from "@/utils/schema/candidate"
import ImageUploader from "@/components/image-uploader"
import { ImageWithFallback } from "@/components/image-with-fallback"
import { QuestionIcon } from "@chakra-ui/icons"
import { IconCircleFilled } from "@tabler/icons-react"
import { getServerAuthSession } from "@/server/auth"

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
	const session = await getServerAuthSession(context)

	if (!session)
		return {
			redirect: {
				destination: "/sign-in",
				permanent: false,
			},
		}

	if (session.user.role === "EMPLOYER")
		return {
			redirect: {
				destination: "/profile/employer",
				permanent: false,
			},
		}

	return {
		props: {},
	}
}

export default function Profile({}: InferGetServerSidePropsType<typeof getServerSideProps>) {
	const { data: currentProfile, isLoading: profileLoading } = api.candidate.currentProfile.useQuery()

	return (
		<>
			<Head>
				<title>Profile | Jobby</title>
			</Head>

			<RootLayout>
				<Stack>
					<ProfileLayout>
						<Stack px={{ base: 6, md: 12 }} spacing={6}>
							<Stack>
								<Heading as="h2" size="lg">
									My Profile
								</Heading>

								{currentProfile && (
									<Skeleton isLoaded={!profileLoading}>
										<HStack>
											<Text>Profile Status:</Text>

											<Badge
												colorScheme={currentProfile.isComplete ? "green" : "red"}
												px={3}
												py={1}
												borderRadius={"full"}
											>
												<HStack>
													<Icon as={IconCircleFilled} w={2} h={2} />
													<Text>
														{currentProfile.isComplete ? "complete" : "not complete"}
													</Text>
												</HStack>
											</Badge>

											{!currentProfile.isComplete && (
												<Tooltip
													hasArrow
													label="Complete your profile by filling every input"
													bg="gray.300"
													color="black"
												>
													<QuestionIcon />
												</Tooltip>
											)}
										</HStack>
									</Skeleton>
								)}
							</Stack>

							<ProfileForm />

							<ContactForm />

							<ChangePasswordForm />
						</Stack>
					</ProfileLayout>
				</Stack>
			</RootLayout>
		</>
	)
}

function ProfileForm() {
	const [showInListings, setShowInListings] = useState(true)
	const {
		isOpen: imageUploadModalOpen,
		onOpen: openImageUploadModal,
		onClose: closeImageUploadModal,
	} = useDisclosure()

	const toast = useToast()

	const {
		register,
		control,
		formState: { errors, isDirty },
		handleSubmit,
		reset,
	} = useForm<CandidateProfileSchema>({
		resolver: zodResolver(candidateProfileSchema),
	})

	const apiContext = api.useContext()

	const { data: currentProfile, isLoading: profileLoading } = api.candidate.currentProfile.useQuery(undefined, {
		onSuccess: (data) => {
			if (data) {
				reset({
					fullName: data.fullName,
					jobTitle: data.jobTitle ?? "",
					phone: data.phone ?? "",
					email: data.email,
					website: data.website ?? "",
					experienceInYears: data.experienceInYears ?? "",
					age: data.age ?? "",
					skills: data.skills,
					bio: data.bio ?? "",
					showInListings: data.showInListings,
				})
			}
		},
	})

	const { mutate: updateProfile, isLoading: updatingProfile } = api.candidate.updateProfile.useMutation({
		onSuccess: () => {
			toast({
				title: "Profile Updated",
				status: "success",
				duration: 3000,
				isClosable: true,
			})

			void apiContext.candidate.currentProfile.invalidate()
		},
	})

	const { mutate: updateProfileImage, isLoading: updateingProfileImage } =
		api.candidate.updateProfileImage.useMutation({
			onSuccess: () => {
				toast({
					title: "Profile Image Updated",
					status: "success",
					duration: 3000,
					isClosable: true,
				})

				void apiContext.candidate.currentProfile.invalidate()
			},
		})

	const onSubmit: SubmitHandler<CandidateProfileSchema> = (data) => {
		if (currentProfile) {
			updateProfile({
				id: currentProfile.id,
				...data,
			})
		}
	}

	return (
		<Stack spacing={5} p={8} border={"1px"} borderColor={"gray.300"} borderRadius={"2xl"} boxShadow={"lg"}>
			<Box>
				<Text fontSize={"2xl"} fontWeight={600}>
					Profile
				</Text>
				<Text color={"gray.500"}>Update your profile</Text>
			</Box>
			<Stack>
				<ImageUploader
					opened={imageUploadModalOpen}
					close={closeImageUploadModal}
					onComplete={(assembly) => {
						if (!currentProfile || !assembly.results.compress_image) return

						const imageUrl = assembly.results.compress_image[0]?.ssl_url as string

						updateProfileImage({
							id: currentProfile.id,
							imageUrl,
						})
					}}
				/>

				<Skeleton isLoaded={!profileLoading}>
					<Stack>
						<Skeleton w={"180px"} h={"180px"} isLoaded={!updateingProfileImage}>
							<Box w={"180px"} h={"180px"} borderRadius={12} overflow={"hidden"}>
								<ImageWithFallback
									src={currentProfile?.image ?? ""}
									fallback="/placeholder-user-image.png"
									alt=""
									width={180}
									height={180}
									style={{
										objectFit: "cover",
										width: "100%",
										height: "100%",
									}}
								/>
							</Box>
						</Skeleton>
						<Flex gap={3}>
							<Button colorScheme="brand" size="xs" onClick={openImageUploadModal}>
								Upload
							</Button>
							<Button
								colorScheme="red"
								size="xs"
								onClick={() => {
									if (currentProfile) {
										updateProfileImage({
											id: currentProfile.id,
											imageUrl: null,
										})
									}
								}}
							>
								Remove
							</Button>
						</Flex>
					</Stack>
				</Skeleton>
			</Stack>
			<Divider />
			{/*  eslint-disable-next-line @typescript-eslint/no-misused-promises */}
			<Grid templateColumns={{ lg: "repeat(2, 1fr)" }} gap={4} as="form" onSubmit={handleSubmit(onSubmit)}>
				<GridItem>
					<Skeleton isLoaded={!profileLoading}>
						<FormControl id="fullName" isInvalid={!!errors.fullName}>
							<FormLabel>Full Name</FormLabel>
							<Input type="text" size="lg" {...register("fullName")} />
							<FormErrorMessage>{errors.fullName && errors.fullName.message}</FormErrorMessage>
						</FormControl>
					</Skeleton>
				</GridItem>

				<GridItem>
					<Skeleton isLoaded={!profileLoading}>
						<FormControl id="jobTitle" isInvalid={!!errors.jobTitle}>
							<FormLabel>Job Title</FormLabel>
							<Input type="text" size="lg" {...register("jobTitle")} />
							<FormErrorMessage>{errors.jobTitle && errors.jobTitle.message}</FormErrorMessage>
						</FormControl>
					</Skeleton>
				</GridItem>

				<GridItem>
					<Skeleton isLoaded={!profileLoading}>
						<FormControl id="phone" isInvalid={!!errors.phone}>
							<FormLabel>Phone</FormLabel>
							<Input type="text" size="lg" {...register("phone")} />
							<FormErrorMessage>{errors.phone && errors.phone.message}</FormErrorMessage>
						</FormControl>
					</Skeleton>
				</GridItem>

				<GridItem>
					<Skeleton isLoaded={!profileLoading}>
						<FormControl id="email" isInvalid={!!errors.email}>
							<FormLabel>Email address</FormLabel>
							<Input type="email" size="lg" {...register("email")} />
							<FormErrorMessage>{errors.email && errors.email.message}</FormErrorMessage>
						</FormControl>
					</Skeleton>
				</GridItem>

				<GridItem>
					<Skeleton isLoaded={!profileLoading}>
						<FormControl id="website" isInvalid={!!errors.website}>
							<FormLabel>Website</FormLabel>
							<Input type="text" size="lg" {...register("website")} />
							<FormErrorMessage>{errors.website && errors.website.message}</FormErrorMessage>
						</FormControl>
					</Skeleton>
				</GridItem>

				<GridItem>
					<Skeleton isLoaded={!profileLoading}>
						<FormControl id="experienceInYears" isInvalid={!!errors.experienceInYears}>
							<FormLabel>Experience (In Years)</FormLabel>
							<Input type="text" size="lg" {...register("experienceInYears")} />
							<FormErrorMessage>
								{errors.experienceInYears && errors.experienceInYears.message}
							</FormErrorMessage>
						</FormControl>
					</Skeleton>
				</GridItem>

				<GridItem>
					<Skeleton isLoaded={!profileLoading}>
						<FormControl id="age" isInvalid={!!errors.age}>
							<FormLabel>Age</FormLabel>
							<Input type="text" size="lg" {...register("age")} />
							<FormErrorMessage>{errors.age && errors.age.message}</FormErrorMessage>
						</FormControl>
					</Skeleton>
				</GridItem>

				<GridItem>
					<Skeleton isLoaded={!profileLoading}>
						<Controller
							control={control}
							name="skills"
							render={({ field: { onChange, onBlur, value, name, ref } }) => (
								<FormControl isInvalid={!!errors.skills} id="skills">
									<FormLabel>Select your skills</FormLabel>
									<CreatableSelect
										size="lg"
										isMulti
										name={name}
										ref={ref}
										onChange={onChange}
										onBlur={onBlur}
										value={value}
										options={[
											{ value: "angular", label: "Angular" },
											{ value: "react", label: "React" },
										]}
										placeholder="E.g. Angular, React..."
										closeMenuOnSelect={false}
									/>

									<FormErrorMessage>{errors.skills && errors.skills.message}</FormErrorMessage>
								</FormControl>
							)}
						/>
					</Skeleton>
				</GridItem>

				<GridItem>
					<Skeleton isLoaded={!profileLoading}>
						<FormControl id="showInListings" isInvalid={!!errors.showInListings}>
							<FormLabel>Allow In Search & Listing</FormLabel>
							<RadioGroup
								onChange={(value) => {
									setShowInListings(() => value === "yes")
								}}
								value={showInListings ? "yes" : "no"}
							>
								<Stack direction="row">
									<Radio value="yes">Yes</Radio>
									<Radio value="no">No</Radio>
								</Stack>
							</RadioGroup>
							<FormErrorMessage>
								{errors.showInListings && errors.showInListings.message}
							</FormErrorMessage>
						</FormControl>
					</Skeleton>
				</GridItem>

				<GridItem colSpan={2}>
					<Skeleton isLoaded={!profileLoading}>
						<FormControl id="bio" isInvalid={!!errors.bio}>
							<FormLabel>Bio</FormLabel>
							<Textarea rows={6} {...register("bio")} />
							<FormErrorMessage>{errors.bio && errors.bio.message}</FormErrorMessage>
						</FormControl>
					</Skeleton>
				</GridItem>

				<GridItem>
					<Button
						type="submit"
						size={"lg"}
						colorScheme="brand"
						fontSize={"md"}
						isDisabled={!isDirty || profileLoading}
						isLoading={updatingProfile}
					>
						Save
					</Button>
				</GridItem>
			</Grid>
		</Stack>
	)
}

function ContactForm() {
	const toast = useToast()

	const {
		register,
		formState: { errors, isDirty },
		handleSubmit,
		reset,
	} = useForm<CandidateContactSchema>({
		resolver: zodResolver(candidateContactSchema),
	})

	const apiContext = api.useContext()

	const { data: currentProfile, isLoading: profileLoading } = api.candidate.currentProfile.useQuery(undefined, {
		onSuccess: (data) => {
			if (data) {
				reset({
					city: data.city ?? "",
					country: data.country ?? "",
					pincode: data.pincode ?? "",
					state: data.state ?? "",
				})
			}
		},
	})

	const { mutate: updateContact, isLoading: updatingContact } = api.candidate.updateContactDetails.useMutation({
		onSuccess: () => {
			toast({
				title: "Contact Updated",
				status: "success",
				duration: 3000,
				isClosable: true,
			})

			void apiContext.candidate.currentProfile.invalidate()
		},
	})

	const onSubmit: SubmitHandler<CandidateContactSchema> = (data) => {
		if (currentProfile) {
			updateContact({
				id: currentProfile.id,
				...data,
			})
		}
	}

	return (
		<Stack spacing={5} p={8} border={"1px"} borderColor={"gray.300"} borderRadius={"2xl"} boxShadow={"lg"}>
			<Box>
				<Text fontSize={"2xl"} fontWeight={600}>
					Contact Information
				</Text>
			</Box>

			{/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
			<Grid templateColumns={{ lg: "repeat(2, 1fr)" }} gap={4} as="form" onSubmit={handleSubmit(onSubmit)}>
				<GridItem>
					<Skeleton isLoaded={!profileLoading}>
						<FormControl id="country" isInvalid={!!errors.country}>
							<FormLabel>Country</FormLabel>
							<Input type="text" size="lg" {...register("country")} />
							<FormErrorMessage>{errors.country && errors.country.message}</FormErrorMessage>
						</FormControl>
					</Skeleton>
				</GridItem>

				<GridItem>
					<Skeleton isLoaded={!profileLoading}>
						<FormControl id="state" isInvalid={!!errors.state}>
							<FormLabel>State</FormLabel>
							<Input type="text" size="lg" {...register("state")} />
							<FormErrorMessage>{errors.state && errors.state.message}</FormErrorMessage>
						</FormControl>
					</Skeleton>
				</GridItem>

				<GridItem>
					{" "}
					<Skeleton isLoaded={!profileLoading}>
						<FormControl id="city" isInvalid={!!errors.city}>
							<FormLabel>City</FormLabel>
							<Input type="text" size="lg" {...register("city")} />
							<FormErrorMessage>{errors.city && errors.city.message}</FormErrorMessage>
						</FormControl>
					</Skeleton>
				</GridItem>

				<GridItem>
					{" "}
					<Skeleton isLoaded={!profileLoading}>
						<FormControl id="pincode" isInvalid={!!errors.pincode}>
							<FormLabel>Pincode</FormLabel>
							<Input type="text" size="lg" {...register("pincode")} />
							<FormErrorMessage>{errors.pincode && errors.pincode.message}</FormErrorMessage>
						</FormControl>
					</Skeleton>
				</GridItem>

				<GridItem>
					<Button
						type="submit"
						size={"lg"}
						colorScheme="brand"
						fontSize={"md"}
						isDisabled={!isDirty}
						isLoading={updatingContact}
					>
						Save
					</Button>
				</GridItem>
			</Grid>
		</Stack>
	)
}

function ChangePasswordForm() {
	return (
		<Stack spacing={5} p={8} border={"1px"} borderColor={"gray.300"} borderRadius={"2xl"} boxShadow={"lg"}>
			<Box>
				<Text fontSize={"2xl"} fontWeight={600}>
					Change Password
				</Text>
			</Box>

			<Grid templateColumns={{ lg: "repeat(2, 1fr)" }} gap={4}>
				<GridItem>
					<FormControl id="password">
						<FormLabel>Password</FormLabel>
						<Input type="password" size="lg" />

						<FormErrorMessage>{}</FormErrorMessage>
					</FormControl>
				</GridItem>

				<GridItem>
					<FormControl id="confirmPassword">
						<FormLabel>Re-Password</FormLabel>
						<Input type="password" size="lg" />
						<FormErrorMessage>{}</FormErrorMessage>
					</FormControl>
				</GridItem>

				<GridItem>
					<Button size={"lg"} colorScheme="brand" fontSize={"md"}>
						Save
					</Button>
				</GridItem>
			</Grid>
		</Stack>
	)
}
